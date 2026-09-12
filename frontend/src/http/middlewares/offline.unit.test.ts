/**
 * Unit tests for http/middlewares/offline — offline mutation queuing.
 *
 * Uses mock adapters to isolate middleware logic from IDB.
 *
 * @module http/middlewares/offline.unit.test
 */

import { NetworkError } from '../types';

import { createOfflineMiddleware } from './offline';

import type { OutboxAdapter } from './types';
import type { RequestContext, ResponseContext } from '../types';
import type { PendingMutation } from '@/db/types';

// ── Mock OutboxAdapter ──────────────────────────────────────────────

/** Creates a mock OutboxAdapter with an in-memory store. */
function createMockOutboxAdapter(): OutboxAdapter & { enqueued: Omit<PendingMutation, 'id'>[] } {
  const enqueued: Omit<PendingMutation, 'id'>[] = [];
  let nextId = 1;

  return {
    enqueued,

    async enqueue(mutation) {
      const id = nextId++;
      enqueued.push(mutation);
      return id;
    },

    async dequeue() {},
    async markSyncing() {},
    async markFailed() {},
    async retry() {
      return 0;
    },
    async getPending() {
      return [];
    },
    async getFailed() {
      return [];
    },
    async count() {
      return enqueued.length;
    },
    async failedCount() {
      return 0;
    },
  };
}

// ── Test fixtures ───────────────────────────────────────────────────

const USER_ID = 'user-1';

/** Creates a GET RequestContext. */
function makeGetCtx(url: string): RequestContext {
  return { config: { method: 'GET', url }, meta: {} };
}

/** Creates a PUT RequestContext. */
function makePutCtx(url: string, data?: unknown, headers?: Record<string, string>): RequestContext {
  return {
    config: { method: 'PUT', url, data, headers },
    meta: {},
  };
}

/** Creates a POST RequestContext. */
function makePostCtx(url: string, data?: unknown): RequestContext {
  return { config: { method: 'POST', url, data }, meta: {} };
}

/** Creates a DELETE RequestContext. */
function makeDeleteCtx(url: string): RequestContext {
  return { config: { method: 'DELETE', url }, meta: {} };
}

/** Standard 200 response from next(). */
const okNext = async () =>
  ({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    meta: {},
    config: { method: 'GET', url: '' },
  }) satisfies ResponseContext;

// ── Tests ───────────────────────────────────────────────────────────

describe('createOfflineMiddleware', () => {
  it('passes through GET requests when offline', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false, // offline
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makeGetCtx('/api/users');
    const result = await offline(ctx, okNext);

    expect(result.status).toBe(200);
    expect(adapter.enqueued).toHaveLength(0);
  });

  it('passes through non-GET requests when online', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => true, // online
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makePutCtx('/api/users/42', { name: 'Alice' });
    const result = await offline(ctx, okNext);

    expect(result.status).toBe(200);
    expect(adapter.enqueued).toHaveLength(0);
  });

  it('queues mutation and returns 202 when offline + OFFLINE_ALLOWED', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makePutCtx(
      '/api/users/42',
      { name: 'Alice' },
      { 'Content-Type': 'application/json' },
    );
    const result = await offline(ctx, okNext);

    expect(result.status).toBe(202);
    expect(result.data).toEqual({ queued: true });
    expect(result.meta.queuedOffline).toBe(true);
    expect(adapter.enqueued).toHaveLength(1);
    expect(adapter.enqueued[0].userId).toBe(USER_ID);
    expect(adapter.enqueued[0].method).toBe('PUT');
    expect(adapter.enqueued[0].url).toBe('/api/users/42');
    expect(adapter.enqueued[0].contentType).toBe('user');
    expect(adapter.enqueued[0].contentId).toBe('42');
  });

  it('throws NetworkError when offline + NOT OFFLINE_ALLOWED', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => false,
      getUserId: async () => USER_ID,
    });

    const ctx = makePutCtx('/api/users/42');

    await expect(offline(ctx, okNext)).rejects.toThrow(NetworkError);
    expect(adapter.enqueued).toHaveLength(0);
  });

  it('throws NetworkError when offline + no user ID', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => true,
      getUserId: async () => undefined,
    });

    const ctx = makePutCtx('/api/users/42');

    await expect(offline(ctx, okNext)).rejects.toThrow(NetworkError);
  });

  it('bypasses queuing when ctx.meta.skipOffline is true', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx: RequestContext = {
      config: { method: 'PUT', url: '/api/users/42' },
      meta: { skipOffline: true },
    };
    const result = await offline(ctx, okNext);

    // Falls through to next (which returns 200).
    expect(result.status).toBe(200);
    expect(adapter.enqueued).toHaveLength(0);
  });

  it('extracts entity type from URL — plural to singular', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makePostCtx('/api/users', { name: 'Bob' });
    await offline(ctx, okNext);

    expect(adapter.enqueued[0].contentType).toBe('user');
    expect(adapter.enqueued[0].contentId).toBe('');
  });

  it('handles URL without trailing ID segment', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makePostCtx('/api/items', { name: 'Widget' });
    await offline(ctx, okNext);

    expect(adapter.enqueued[0].contentType).toBe('item');
    expect(adapter.enqueued[0].contentId).toBe('');
  });

  it('handles URL with single segment after /api/', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makeDeleteCtx('/api/settings');
    await offline(ctx, okNext);

    expect(adapter.enqueued[0].contentType).toBe('setting');
    expect(adapter.enqueued[0].contentId).toBe('');
  });

  it('supports async isOfflineAllowed predicate', async () => {
    const adapter = createMockOutboxAdapter();
    const offline = createOfflineMiddleware({
      adapter,
      onlinePredicate: () => false,
      isOfflineAllowed: async () => true,
      getUserId: async () => USER_ID,
    });

    const ctx = makePutCtx('/api/users/42');
    const result = await offline(ctx, okNext);

    expect(result.status).toBe(202);
    expect(adapter.enqueued).toHaveLength(1);
  });
});
