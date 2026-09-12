/**
 * Unit tests for db/outbox-sync — drains pending mutations on reconnect.
 *
 * Uses a mock OutboxAdapter and a mock Transport (client) to isolate
 * the sync engine from IDB and the real HTTP pipeline.
 *
 * @module db/outbox-sync.unit.test
 */

import { createOutboxSyncEngine } from './outbox-sync';

import type { PendingMutation } from './types';
import type { OutboxAdapter } from '@/http/middlewares/types';
import type { RequestContext, ResponseContext, Transport } from '@/http/types';

// ── Mock OutboxAdapter ──────────────────────────────────────────────

/** Creates a mock OutboxAdapter with controllable state. */
function createMockAdapter(): OutboxAdapter & {
  mutations: Map<number, PendingMutation>;
  nextId: number;
} {
  const mutations = new Map<number, PendingMutation>();
  let nextId = 1;

  return {
    mutations,
    nextId,

    async enqueue(mutation) {
      const id = nextId++;
      mutations.set(id, { ...mutation, id });
      return id;
    },

    async dequeue(id) {
      mutations.delete(id);
    },

    async markSyncing(id) {
      const m = mutations.get(id);
      if (m) mutations.set(id, { ...m, status: 'syncing' });
    },

    async markFailed(id) {
      const m = mutations.get(id);
      if (m) mutations.set(id, { ...m, status: 'failed' });
    },

    async retry(id, maxRetries) {
      const m = mutations.get(id);
      if (!m) return 0;

      const newRetryCount = m.retryCount + 1;

      if (newRetryCount >= maxRetries) {
        mutations.set(id, { ...m, status: 'failed', retryCount: newRetryCount });
      } else {
        mutations.set(id, { ...m, status: 'pending', retryCount: newRetryCount });
      }

      return newRetryCount;
    },

    async getPending() {
      return Array.from(mutations.values())
        .filter((m) => m.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async getFailed() {
      return Array.from(mutations.values())
        .filter((m) => m.status === 'failed')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async count() {
      return Array.from(mutations.values()).filter((m) => m.status === 'pending').length;
    },

    async failedCount() {
      return Array.from(mutations.values()).filter((m) => m.status === 'failed').length;
    },
  };
}

// ── Mock Transport ──────────────────────────────────────────────────

/** Creates a mock Transport that can succeed or fail per URL pattern. */
function createMockTransport(failFor?: Set<string>): Transport & { calls: RequestContext[] } {
  const calls: RequestContext[] = [];

  const transport: Transport & { calls: RequestContext[] } = async (ctx) => {
    calls.push(ctx);

    if (failFor?.has(ctx.config.url)) {
      throw new Error(`Transport error for ${ctx.config.url}`);
    }

    return {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      meta: {},
      config: ctx.config,
    } satisfies ResponseContext;
  };

  transport.calls = calls;

  return transport;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Adds a pending mutation to the mock adapter. */
function addMutation(
  adapter: ReturnType<typeof createMockAdapter>,
  overrides?: Partial<Omit<PendingMutation, 'id'>>,
): number {
  const id = adapter.nextId;
  const mutation: PendingMutation = {
    id,
    userId: 'user-1',
    contentType: 'user',
    contentId: '42',
    method: 'PUT',
    url: '/api/users/42',
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: 'Alice' }),
    createdAt: new Date(Date.now() + id * 1000).toISOString(),
    status: 'pending',
    retryCount: 0,
    ...overrides,
  };
  adapter.mutations.set(id, mutation);
  adapter.nextId = id + 1;
  return id;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('createOutboxSyncEngine', () => {
  it('drains all pending mutations on sync', async () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();
    const invalidated = new Set<string>();

    addMutation(adapter, { contentType: 'user', url: '/api/users/42' });
    addMutation(adapter, { contentType: 'user', url: '/api/users/43' });

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: (types) => {
        types.forEach((t) => invalidated.add(t));
      },
    });

    const result = await engine.sync();

    expect(result.replayed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.entityTypes).toContain('user');
    expect(adapter.mutations.size).toBe(0);
    expect(transport.calls).toHaveLength(2);
  });

  it('marks failed mutations and continues draining', async () => {
    const adapter = createMockAdapter();
    const failUrls = new Set(['/api/users/42']);
    const transport = createMockTransport(failUrls);
    const invalidated = new Set<string>();

    addMutation(adapter, { contentType: 'user', url: '/api/users/42', retryCount: 2 });
    addMutation(adapter, { contentType: 'user', url: '/api/users/43' });

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: (types) => {
        types.forEach((t) => invalidated.add(t));
      },
    });

    const result = await engine.sync();

    expect(result.replayed).toBe(1);
    expect(result.failed).toBe(1);

    // Failed entry should be marked as 'failed' after max retries (3).
    const failed = await adapter.getFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].url).toBe('/api/users/42');
    expect(failed[0].retryCount).toBe(3);
  });

  it('stops draining after maxConsecutiveFailures', async () => {
    const adapter = createMockAdapter();
    // All requests fail.
    const transport = createMockTransport(
      new Set(['/api/users/42', '/api/users/43', '/api/users/44']),
    );
    const invalidated = new Set<string>();

    addMutation(adapter, { contentType: 'user', url: '/api/users/42', retryCount: 2 });
    addMutation(adapter, { contentType: 'user', url: '/api/users/43', retryCount: 2 });
    addMutation(adapter, { contentType: 'user', url: '/api/users/44', retryCount: 2 });

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: (types) => {
        types.forEach((t) => invalidated.add(t));
      },
      maxConsecutiveFailures: 2,
      maxRetries: 3,
    });

    const result = await engine.sync();

    // After 2 consecutive failures, the engine stops.
    expect(result.failed).toBe(2);
    expect(result.replayed).toBe(0);
    // Third mutation should remain in the outbox (not attempted).
    expect(adapter.mutations.size).toBeGreaterThanOrEqual(1);
  });

  it('replays mutations with skipOffline and skipCache meta', async () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    addMutation(adapter);

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    await engine.sync();

    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].meta.skipOffline).toBe(true);
    expect(transport.calls[0].meta.skipCache).toBe(true);
    expect(transport.calls[0].meta.maxRetries).toBe(0);
  });

  it('replays with original headers and body', async () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    addMutation(adapter, {
      method: 'PUT',
      url: '/api/users/42',
      headers: JSON.stringify({ Authorization: 'Bearer old-token' }),
      body: JSON.stringify({ name: 'Alice' }),
    });

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    await engine.sync();

    expect(transport.calls[0].config.method).toBe('PUT');
    expect(transport.calls[0].config.url).toBe('/api/users/42');
    expect(transport.calls[0].config.headers).toEqual({ Authorization: 'Bearer old-token' });
    expect(transport.calls[0].config.data).toEqual({ name: 'Alice' });
  });

  it('invalidates queries for affected entity types', async () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();
    const invalidated = new Set<string>();

    addMutation(adapter, { contentType: 'user', url: '/api/users/42' });
    addMutation(adapter, { contentType: 'setting', url: '/api/settings/theme' });

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: (types) => {
        types.forEach((t) => invalidated.add(t));
      },
    });

    const result = await engine.sync();

    expect(result.entityTypes).toContain('user');
    expect(result.entityTypes).toContain('setting');
    expect(invalidated).toContain('user');
    expect(invalidated).toContain('setting');
  });

  it('does not invalidate queries when no mutations replayed', async () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();
    let invalidated = false;

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {
        invalidated = true;
      },
    });

    const result = await engine.sync();

    expect(result.replayed).toBe(0);
    expect(invalidated).toBe(false);
  });

  it('prevents concurrent sync cycles', async () => {
    const adapter = createMockAdapter();
    let transportCallCount = 0;

    const slowTransport: Transport = async (ctx) => {
      transportCallCount++;
      await new Promise((r) => setTimeout(r, 50));
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        meta: {},
        config: ctx.config,
      };
    };

    addMutation(adapter, { contentType: 'user', url: '/api/users/42' });

    const engine = createOutboxSyncEngine({
      adapter,
      client: slowTransport,
      invalidateQueries: () => {},
    });

    // Fire two concurrent syncs — only one should run.
    const [result1, result2] = await Promise.all([engine.sync(), engine.sync()]);

    // The second call should be a no-op (isSyncing guard).
    expect(transportCallCount).toBe(1);
    expect(result1.replayed + result2.replayed).toBe(1);
  });

  it('returns empty result when no pending mutations', async () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    const result = await engine.sync();

    expect(result.replayed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.entityTypes.size).toBe(0);
  });
});

// ── Lifecycle (start/stop) ──────────────────────────────────────────

describe('createOutboxSyncEngine lifecycle', () => {
  it('start registers an online event listener', () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    const addSpy = vi.spyOn(window, 'addEventListener');

    engine.start();

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));

    addSpy.mockRestore();
    engine.stop();
  });

  it('stop removes the online event listener', () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    engine.start();

    const removeSpy = vi.spyOn(window, 'removeEventListener');

    engine.stop();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('does not register duplicate listeners on multiple start calls', () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    const addSpy = vi.spyOn(window, 'addEventListener');

    engine.start();
    engine.start(); // Second call should be a no-op.

    expect(addSpy).toHaveBeenCalledTimes(1);

    addSpy.mockRestore();
    engine.stop();
  });

  it('stop is a no-op when not started', () => {
    const adapter = createMockAdapter();
    const transport = createMockTransport();

    const engine = createOutboxSyncEngine({
      adapter,
      client: transport,
      invalidateQueries: () => {},
    });

    // Should not throw.
    engine.stop();
  });
});
