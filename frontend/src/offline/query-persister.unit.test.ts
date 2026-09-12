/**
 * Unit tests for offline/query-persister — Dexie-backed TanStack Query persister.
 *
 * @module offline/query-persister.unit.test
 */

import { db } from '../db/app-db';

import { createDexiePersister } from './query-persister';

import type { PinAdapter } from './pin-adapter';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

// ── JWT helper ─────────────────────────────────────────────────────

const JWT =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// ── Mock PinAdapter ────────────────────────────────────────────────

/** Creates a mock PinAdapter with explicit pin state for testing. */
function createMockAdapter(
  pins: { userId: string; contentType: string; contentId: string }[],
): PinAdapter {
  const pinSet = new Set(pins.map((p) => `${p.userId}:${p.contentType}:${p.contentId}`));
  const pinsByType = new Map<string, typeof pins>();
  for (const p of pins) {
    const key = `${p.userId}:${p.contentType}`;
    const arr = pinsByType.get(key) ?? [];
    arr.push(p);
    pinsByType.set(key, arr);
  }

  return {
    async pin() {},
    async unpin() {},
    async isPinned(userId, contentType, contentId) {
      return pinSet.has(`${userId}:${contentType}:${contentId}`);
    },
    async getAll(userId) {
      return pins
        .filter((p) => p.userId === userId)
        .map((p) => ({
          ...p,
          pinnedAt: '2025-01-01T00:00:00Z',
          estimatedSizeBytes: 0,
        }));
    },
    async getByEntityType(userId, contentType) {
      const arr = pinsByType.get(`${userId}:${contentType}`) ?? [];
      return arr.map((p) => ({
        ...p,
        pinnedAt: '2025-01-01T00:00:00Z',
        estimatedSizeBytes: 0,
      }));
    },
    async updateSize() {},
  };
}

// ── Fixtures ───────────────────────────────────────────────────────

const USER_ID = 'user-1';

function makePersistedClient(
  queries: { queryHash: string; queryKey: unknown[]; state: unknown }[],
): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: 'test-buster',
    clientState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queries: queries.map((q) => ({ ...q, state: q.state })) as any,
      mutations: [],
    },
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

// ── persistClient ──────────────────────────────────────────────────

describe('createDexiePersister — persistClient', () => {
  it('persists a detail query when the record is pinned', async () => {
    const adapter = createMockAdapter([{ userId: USER_ID, contentType: 'user', contentId: '42' }]);
    const persister = createDexiePersister(adapter, () => USER_ID);

    await persister.persistClient(
      makePersistedClient([
        {
          queryHash: '["user","42"]',
          queryKey: ['user', JWT, '42'],
          state: { data: { name: 'Alice' } },
        },
      ]),
    );

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].entityType).toBe('user');
    expect(rows[0].recordIds).toEqual(['42']);
  });

  it('drops a detail query when the record is NOT pinned', async () => {
    const adapter = createMockAdapter([]); // No pins
    const persister = createDexiePersister(adapter, () => USER_ID);

    await persister.persistClient(
      makePersistedClient([
        {
          queryHash: '["user","42"]',
          queryKey: ['user', JWT, '42'],
          state: { data: { name: 'Alice' } },
        },
      ]),
    );

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(0);
  });

  it('persists a list query when ANY record of the entity type is pinned', async () => {
    const adapter = createMockAdapter([{ userId: USER_ID, contentType: 'user', contentId: '42' }]);
    const persister = createDexiePersister(adapter, () => USER_ID);

    await persister.persistClient(
      makePersistedClient([
        {
          queryHash: '["users",{"page":0}]',
          queryKey: ['users', JWT, { page: 0 }],
          state: { data: [{ id: '42' }, { id: '43' }] },
        },
      ]),
    );

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].entityType).toBe('user');
    expect(rows[0].recordIds).toEqual([]); // List queries have no recordIds
  });

  it('drops a list query when no records of the entity type are pinned', async () => {
    const adapter = createMockAdapter([]); // No pins
    const persister = createDexiePersister(adapter, () => USER_ID);

    await persister.persistClient(
      makePersistedClient([
        {
          queryHash: '["users",{"page":0}]',
          queryKey: ['users', JWT, { page: 0 }],
          state: { data: [] },
        },
      ]),
    );

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(0);
  });

  it('clears IDB when userId is undefined (not authenticated)', async () => {
    const adapter = createMockAdapter([]);
    const persister = createDexiePersister(adapter, () => undefined);

    // Seed an existing row.
    await db.cachedQueries.put({
      queryHash: 'old',
      queryKey: '[]',
      state: '{}',
      timestamp: 1,
      buster: 'x',
      recordIds: [],
      entityType: 'user',
    });

    await persister.persistClient(makePersistedClient([]));

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(0);
  });

  it('clears IDB when all queries are filtered out', async () => {
    const adapter = createMockAdapter([]); // No pins
    const persister = createDexiePersister(adapter, () => USER_ID);

    // Seed stale data.
    await db.cachedQueries.put({
      queryHash: 'stale',
      queryKey: '[]',
      state: '{}',
      timestamp: 1,
      buster: 'x',
      recordIds: [],
      entityType: 'user',
    });

    await persister.persistClient(
      makePersistedClient([
        { queryHash: '["user","1"]', queryKey: ['user', JWT, '1'], state: { data: {} } },
      ]),
    );

    // The detail query is not pinned → all filtered → DB cleared.
    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(0);
  });

  it('mixes pinned and unpinned queries correctly', async () => {
    const adapter = createMockAdapter([{ userId: USER_ID, contentType: 'user', contentId: '42' }]);
    const persister = createDexiePersister(adapter, () => USER_ID);

    await persister.persistClient(
      makePersistedClient([
        // Pinned detail → persisted.
        { queryHash: 'h1', queryKey: ['user', JWT, '42'], state: { data: { name: 'Alice' } } },
        // Unpinned detail → dropped.
        { queryHash: 'h2', queryKey: ['user', JWT, '99'], state: { data: { name: 'Bob' } } },
        // List with pinned type → persisted.
        { queryHash: 'h3', queryKey: ['users', JWT, { page: 0 }], state: { data: [] } },
        // List with no pinned type → dropped.
        { queryHash: 'h4', queryKey: ['orders', JWT, { page: 0 }], state: { data: [] } },
      ]),
    );

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.queryHash).sort()).toEqual(['h1', 'h3']);
  });
});

// ── restoreClient ──────────────────────────────────────────────────

describe('createDexiePersister — restoreClient', () => {
  it('returns undefined when no cached queries exist', async () => {
    const adapter = createMockAdapter([]);
    const persister = createDexiePersister(adapter, () => USER_ID);

    const restored = await persister.restoreClient();
    expect(restored).toBeUndefined();
  });

  it('restores previously persisted queries', async () => {
    const adapter = createMockAdapter([{ userId: USER_ID, contentType: 'user', contentId: '42' }]);
    const persister = createDexiePersister(adapter, () => USER_ID);

    const client = makePersistedClient([
      { queryHash: 'h1', queryKey: ['user', JWT, '42'], state: { data: { name: 'Alice' } } },
    ]);

    await persister.persistClient(client);
    const restored = await persister.restoreClient();

    expect(restored).toBeDefined();
    expect(restored!.buster).toBe(client.buster);
    expect(restored!.clientState.queries).toHaveLength(1);
    expect(restored!.clientState.queries[0].queryHash).toBe('h1');
  });
});

// ── removeClient ───────────────────────────────────────────────────

describe('createDexiePersister — removeClient', () => {
  it('clears all cached queries', async () => {
    const adapter = createMockAdapter([{ userId: USER_ID, contentType: 'user', contentId: '42' }]);
    const persister = createDexiePersister(adapter, () => USER_ID);

    await persister.persistClient(
      makePersistedClient([
        { queryHash: 'h1', queryKey: ['user', JWT, '42'], state: { data: {} } },
      ]),
    );

    await persister.removeClient();

    const rows = await db.cachedQueries.toArray();
    expect(rows).toHaveLength(0);
  });
});
