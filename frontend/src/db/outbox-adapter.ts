/**
 * Dexie-backed OutboxAdapter for the offline middleware.
 *
 * Stores pending mutations in the `mutations` Dexie table and
 * manages the `pending → syncing → (dequeue | failed)` lifecycle.
 *
 * @module db/outbox-adapter
 */

import { db } from './app-db';

import type { PendingMutation } from './types';
import type { OutboxAdapter } from '@/http/middlewares/types';

/**
 * Production OutboxAdapter backed by the Dexie `mutations` table.
 *
 * Uses the `[userId+status]` compound index for efficient pending
 * queries and the `createdAt` index for ordered drain.
 */
export class DexieOutboxAdapter implements OutboxAdapter {
  async enqueue(mutation: Omit<PendingMutation, 'id'>): Promise<number> {
    return db.mutations.add(mutation);
  }

  async dequeue(id: number): Promise<void> {
    await db.mutations.delete(id);
  }

  async markSyncing(id: number): Promise<void> {
    await db.mutations.update(id, { status: 'syncing' });
  }

  async markFailed(id: number): Promise<void> {
    await db.mutations.update(id, { status: 'failed' });
  }

  async getPending(): Promise<PendingMutation[]> {
    return db.mutations.where('status').equals('pending').sortBy('createdAt');
  }

  async getFailed(): Promise<PendingMutation[]> {
    return db.mutations.where('status').equals('failed').sortBy('createdAt');
  }

  async count(): Promise<number> {
    return db.mutations.where('status').equals('pending').count();
  }
}

/**
 * Default singleton adapter instance.
 *
 * Import this — never instantiate `DexieOutboxAdapter` yourself
 * (outside of tests).
 */
export const outboxAdapter = new DexieOutboxAdapter();
