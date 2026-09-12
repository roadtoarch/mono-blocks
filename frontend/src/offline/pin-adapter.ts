/**
 * Pin registry adapter — interface and Dexie implementation.
 *
 * The PinAdapter abstracts pin CRUD so that the persister and UI hooks
 * never import Dexie directly. The DexiePinAdapter is the production
 * implementation; tests can swap in an in-memory adapter.
 *
 * @module offline/pin-adapter
 */

import { db } from '../db/app-db';

import type { PinnedRecord } from '../db/types';

// ── Interface ──────────────────────────────────────────────────────

/**
 * Contract for the per-record pin registry.
 *
 * Implementations must ensure that pin operations are idempotent and
 * that the pin table is NEVER cleared by cache eviction logic — only
 * by explicit user unpin actions (DEC-8).
 */
export interface PinAdapter {
  /** Pin a record for offline persistence. Idempotent. */
  pin(record: Omit<PinnedRecord, 'pinnedAt' | 'estimatedSizeBytes'>): Promise<void>;
  /** Remove a pin. No-op if the record is not pinned. */
  unpin(userId: string, contentType: string, contentId: string): Promise<void>;
  /** Check whether a specific record is pinned. */
  isPinned(userId: string, contentType: string, contentId: string): Promise<boolean>;
  /** Return all pinned records for a user. */
  getAll(userId: string): Promise<PinnedRecord[]>;
  /** Return pinned records for a specific entity type. */
  getByEntityType(userId: string, contentType: string): Promise<PinnedRecord[]>;
  /** Update the estimated storage size for a pinned record. */
  updateSize(userId: string, contentType: string, contentId: string, bytes: number): Promise<void>;
}

// ── Dexie implementation ───────────────────────────────────────────

/**
 * Production PinAdapter backed by the Dexie `pins` table.
 *
 * Uses the composite index `[userId+contentType+contentId]` for
 * efficient lookups.
 */
export class DexiePinAdapter implements PinAdapter {
  async pin(record: Omit<PinnedRecord, 'pinnedAt' | 'estimatedSizeBytes'>): Promise<void> {
    await db.pins.put({
      ...record,
      pinnedAt: new Date().toISOString(),
      estimatedSizeBytes: 0,
    });
  }

  async unpin(userId: string, contentType: string, contentId: string): Promise<void> {
    await db.pins
      .where('[userId+contentType+contentId]')
      .equals([userId, contentType, contentId])
      .delete();
  }

  async isPinned(userId: string, contentType: string, contentId: string): Promise<boolean> {
    const count = await db.pins
      .where('[userId+contentType+contentId]')
      .equals([userId, contentType, contentId])
      .count();
    return count > 0;
  }

  async getAll(userId: string): Promise<PinnedRecord[]> {
    return db.pins.where('userId').equals(userId).toArray();
  }

  async getByEntityType(userId: string, contentType: string): Promise<PinnedRecord[]> {
    return db.pins.where('[userId+contentType]').equals([userId, contentType]).toArray();
  }

  async updateSize(
    userId: string,
    contentType: string,
    contentId: string,
    bytes: number,
  ): Promise<void> {
    await db.pins
      .where('[userId+contentType+contentId]')
      .equals([userId, contentType, contentId])
      .modify({ estimatedSizeBytes: bytes });
  }
}

/**
 * Default singleton adapter instance.
 *
 * Import this — never instantiate `DexiePinAdapter` yourself
 * (outside of tests).
 */
export const pinAdapter = new DexiePinAdapter();
