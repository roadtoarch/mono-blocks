/**
 * Dexie-backed OutboxAdapter for the offline middleware.
 *
 * Stores pending mutations in the `mutations` Dexie table and
 * manages the `pending → syncing → (dequeue | retry → failed)` lifecycle.
 *
 * Per-mutation retry tracking (6.3): each failed replay increments
 * `retryCount` and resets to `pending`. After `maxRetries` attempts,
 * the mutation is marked `failed` and surfaced to the user.
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
    await db.mutations.update(id, {
      status: 'failed',
      retriedAt: new Date().toISOString(),
    });
  }

  async retry(id: number, maxRetries: number): Promise<number> {
    const mutation = await db.mutations.get(id);
    if (!mutation) return 0;

    const newRetryCount = mutation.retryCount + 1;

    if (newRetryCount >= maxRetries) {
      await db.mutations.update(id, {
        status: 'failed',
        retryCount: newRetryCount,
        retriedAt: new Date().toISOString(),
      });
    } else {
      await db.mutations.update(id, {
        status: 'pending',
        retryCount: newRetryCount,
        retriedAt: new Date().toISOString(),
      });
    }

    return newRetryCount;
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

  async failedCount(): Promise<number> {
    return db.mutations.where('status').equals('failed').count();
  }
}

/**
 * Default singleton adapter instance.
 *
 * Import this — never instantiate `DexieOutboxAdapter` yourself
 * (outside of tests).
 */
export const outboxAdapter = new DexieOutboxAdapter();
