/**
 * Unit tests for offline/pin-adapter — Dexie-backed pin registry.
 *
 * Uses fake-indexeddb (global setup in test-setup.ts) so Dexie
 * operates against an in-memory IDB instead of the browser.
 *
 * @module offline/pin-adapter.unit.test
 */

import { db } from '../db/app-db';

import { DexiePinAdapter } from './pin-adapter';

// ── Helpers ─────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const USER_ID_2 = 'user-2';

/** Creates a pin input (omits auto-generated fields). */
function makePinInput(
  overrides?: Partial<{ userId: string; contentType: string; contentId: string }>,
) {
  return {
    userId: overrides?.userId ?? USER_ID,
    contentType: overrides?.contentType ?? 'user',
    contentId: overrides?.contentId ?? 'record-1',
  };
}

beforeEach(async () => {
  // Delete and recreate the DB so each test starts clean.
  await db.delete();
  await db.open();
});

afterAll(async () => {
  await db.delete();
});

// ── Pin operation ──────────────────────────────────────────────────

describe('DexiePinAdapter.pin', () => {
  it('pins a record and stores it in IDB', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput());

    const rows = await db.pins.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(USER_ID);
    expect(rows[0].contentType).toBe('user');
    expect(rows[0].contentId).toBe('record-1');
    expect(rows[0].pinnedAt).toBeTruthy();
    expect(rows[0].estimatedSizeBytes).toBe(0);
  });

  it('is idempotent — pinning the same record twice does not duplicate', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput());
    await adapter.pin(makePinInput());

    const rows = await db.pins.toArray();
    // put() upserts on the compound key.
    expect(rows).toHaveLength(1);
  });
});

// ── Unpin operation ────────────────────────────────────────────────

describe('DexiePinAdapter.unpin', () => {
  it('removes a pinned record', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput());
    await adapter.unpin(USER_ID, 'user', 'record-1');

    const rows = await db.pins.toArray();
    expect(rows).toHaveLength(0);
  });

  it('is a no-op when the record is not pinned', async () => {
    const adapter = new DexiePinAdapter();
    // Should not throw.
    await expect(adapter.unpin(USER_ID, 'user', 'nonexistent')).resolves.toBeUndefined();
  });

  it('only unpins the specific record, not others with the same type', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput({ contentId: 'record-1' }));
    await adapter.pin(makePinInput({ contentId: 'record-2' }));

    await adapter.unpin(USER_ID, 'user', 'record-1');

    const remaining = await db.pins.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].contentId).toBe('record-2');
  });
});

// ── IsPinned check ─────────────────────────────────────────────────

describe('DexiePinAdapter.isPinned', () => {
  it('returns true for a pinned record', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput());

    expect(await adapter.isPinned(USER_ID, 'user', 'record-1')).toBe(true);
  });

  it('returns false for a non-pinned record', async () => {
    const adapter = new DexiePinAdapter();
    expect(await adapter.isPinned(USER_ID, 'user', 'nonexistent')).toBe(false);
  });

  it('returns false for a different user with the same record', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput({ userId: USER_ID }));

    expect(await adapter.isPinned(USER_ID_2, 'user', 'record-1')).toBe(false);
  });
});

// ── GetAll ─────────────────────────────────────────────────────────

describe('DexiePinAdapter.getAll', () => {
  it('returns all pins for a user', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput({ contentId: 'r1' }));
    await adapter.pin(makePinInput({ contentId: 'r2', contentType: 'order' }));
    await adapter.pin(makePinInput({ userId: USER_ID_2, contentId: 'r3' }));

    const pins = await adapter.getAll(USER_ID);
    expect(pins).toHaveLength(2);
    expect(pins.map((p) => p.contentId).sort()).toEqual(['r1', 'r2']);
  });

  it('returns an empty array for a user with no pins', async () => {
    const adapter = new DexiePinAdapter();
    expect(await adapter.getAll(USER_ID)).toEqual([]);
  });
});

// ── GetByEntityType ────────────────────────────────────────────────

describe('DexiePinAdapter.getByEntityType', () => {
  it('returns pins filtered by entity type', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput({ contentType: 'user', contentId: 'r1' }));
    await adapter.pin(makePinInput({ contentType: 'order', contentId: 'r2' }));
    await adapter.pin(makePinInput({ contentType: 'user', contentId: 'r3' }));

    const userPins = await adapter.getByEntityType(USER_ID, 'user');
    expect(userPins).toHaveLength(2);
    expect(userPins.map((p) => p.contentId).sort()).toEqual(['r1', 'r3']);
  });

  it('returns an empty array when no pins match the entity type', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput({ contentType: 'user', contentId: 'r1' }));

    expect(await adapter.getByEntityType(USER_ID, 'order')).toEqual([]);
  });

  it('does not return pins from other users', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput({ userId: USER_ID, contentType: 'user', contentId: 'r1' }));
    await adapter.pin(makePinInput({ userId: USER_ID_2, contentType: 'user', contentId: 'r2' }));

    const pins = await adapter.getByEntityType(USER_ID, 'user');
    expect(pins).toHaveLength(1);
    expect(pins[0].contentId).toBe('r1');
  });
});

// ── UpdateSize ─────────────────────────────────────────────────────

describe('DexiePinAdapter.updateSize', () => {
  it('updates the estimated size for a pinned record', async () => {
    const adapter = new DexiePinAdapter();
    await adapter.pin(makePinInput());
    await adapter.updateSize(USER_ID, 'user', 'record-1', 2048);

    const row = (await db.pins.toArray())[0];
    expect(row.estimatedSizeBytes).toBe(2048);
  });

  it('does not throw when updating a non-existent record', async () => {
    const adapter = new DexiePinAdapter();
    // Dexie modify() on no match is a no-op.
    await expect(adapter.updateSize(USER_ID, 'user', 'nonexistent', 100)).resolves.toBeUndefined();
  });
});
