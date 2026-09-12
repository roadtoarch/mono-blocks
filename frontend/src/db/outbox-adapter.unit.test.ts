/**
 * Unit tests for db/outbox-adapter — Dexie-backed offline outbox.
 *
 * Uses fake-indexeddb (global setup in test-setup.ts) so Dexie
 * operates against an in-memory IDB instead of the browser.
 *
 * @module db/outbox-adapter.unit.test
 */

import { db } from './app-db';
import { DexieOutboxAdapter } from './outbox-adapter';

import type { PendingMutation } from './types';

// ── Helpers ─────────────────────────────────────────────────────────

const USER_ID = 'user-1';

/** Creates a pending mutation input (omits auto-generated id). */
function makeMutation(
  overrides?: Partial<Omit<PendingMutation, 'id'>>,
): Omit<PendingMutation, 'id'> {
  return {
    userId: overrides?.userId ?? USER_ID,
    contentType: overrides?.contentType ?? 'user',
    contentId: overrides?.contentId ?? '42',
    method: overrides?.method ?? 'PUT',
    url: overrides?.url ?? '/api/users/42',
    headers: overrides?.headers ?? JSON.stringify({ 'Content-Type': 'application/json' }),
    body: overrides?.body ?? JSON.stringify({ name: 'Alice' }),
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

// ── enqueue ─────────────────────────────────────────────────────────

describe('DexieOutboxAdapter.enqueue', () => {
  it('adds a mutation and returns its auto-generated ID', async () => {
    const adapter = new DexieOutboxAdapter();
    const id = await adapter.enqueue(makeMutation());

    expect(typeof id).toBe('number');
    const row = await db.mutations.get(id);
    expect(row).toBeDefined();
    expect(row!.userId).toBe(USER_ID);
    expect(row!.contentType).toBe('user');
    expect(row!.method).toBe('PUT');
    expect(row!.status).toBe('pending');
  });

  it('preserves the createdAt order', async () => {
    const adapter = new DexieOutboxAdapter();
    const id1 = await adapter.enqueue(makeMutation({ createdAt: '2025-01-01T00:00:00Z' }));
    const id2 = await adapter.enqueue(makeMutation({ createdAt: '2025-01-01T00:01:00Z' }));

    const pending = await adapter.getPending();
    expect(pending[0].id).toBe(id1);
    expect(pending[1].id).toBe(id2);
  });
});

// ── dequeue ─────────────────────────────────────────────────────────

describe('DexieOutboxAdapter.dequeue', () => {
  it('removes a mutation by ID', async () => {
    const adapter = new DexieOutboxAdapter();
    const id = await adapter.enqueue(makeMutation());
    await adapter.dequeue(id);

    const row = await db.mutations.get(id);
    expect(row).toBeUndefined();
  });

  it('does nothing for a non-existent ID', async () => {
    const adapter = new DexieOutboxAdapter();
    // Should not throw.
    await adapter.dequeue(99999);
  });
});

// ── markSyncing ─────────────────────────────────────────────────────

describe('DexieOutboxAdapter.markSyncing', () => {
  it('updates the status to syncing', async () => {
    const adapter = new DexieOutboxAdapter();
    const id = await adapter.enqueue(makeMutation());
    await adapter.markSyncing(id);

    const row = await db.mutations.get(id);
    expect(row!.status).toBe('syncing');
  });
});

// ── markFailed ──────────────────────────────────────────────────────

describe('DexieOutboxAdapter.markFailed', () => {
  it('updates the status to failed', async () => {
    const adapter = new DexieOutboxAdapter();
    const id = await adapter.enqueue(makeMutation());
    await adapter.markFailed(id);

    const row = await db.mutations.get(id);
    expect(row!.status).toBe('failed');
  });
});

// ── getPending ──────────────────────────────────────────────────────

describe('DexieOutboxAdapter.getPending', () => {
  it('returns only pending mutations sorted by createdAt', async () => {
    const adapter = new DexieOutboxAdapter();
    await adapter.enqueue(makeMutation({ createdAt: '2025-01-01T00:02:00Z' }));
    const id2 = await adapter.enqueue(makeMutation({ createdAt: '2025-01-01T00:01:00Z' }));
    await adapter.enqueue(makeMutation({ createdAt: '2025-01-01T00:03:00Z' }));

    // Mark one as syncing — it should not appear.
    await adapter.markSyncing(id2);

    const pending = await adapter.getPending();
    expect(pending).toHaveLength(2);
    expect(pending[0].createdAt).toBe('2025-01-01T00:02:00Z');
    expect(pending[1].createdAt).toBe('2025-01-01T00:03:00Z');
  });

  it('returns empty array when no pending mutations exist', async () => {
    const adapter = new DexieOutboxAdapter();
    const pending = await adapter.getPending();
    expect(pending).toEqual([]);
  });
});

// ── getFailed ───────────────────────────────────────────────────────

describe('DexieOutboxAdapter.getFailed', () => {
  it('returns only failed mutations', async () => {
    const adapter = new DexieOutboxAdapter();
    const id1 = await adapter.enqueue(makeMutation());
    await adapter.enqueue(makeMutation());

    await adapter.markFailed(id1);

    const failed = await adapter.getFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe(id1);
  });
});

// ── count ───────────────────────────────────────────────────────────

describe('DexieOutboxAdapter.count', () => {
  it('returns the count of pending mutations only', async () => {
    const adapter = new DexieOutboxAdapter();
    await adapter.enqueue(makeMutation());
    const id2 = await adapter.enqueue(makeMutation());
    await adapter.enqueue(makeMutation());

    // Mark one as syncing — it should not count.
    await adapter.markSyncing(id2);

    expect(await adapter.count()).toBe(2);
  });

  it('returns 0 when no pending mutations exist', async () => {
    const adapter = new DexieOutboxAdapter();
    expect(await adapter.count()).toBe(0);
  });
});
