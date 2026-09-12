/**
 * Offline middleware — queues mutations when the client is offline.
 *
 * When the browser is offline AND the current user has the
 * `OFFLINE_ALLOWED` role, this middleware intercepts non-GET requests
 * and persists them to the outbox (via the OutboxAdapter). The
 * calling code receives a synthetic 202 Accepted response so that
 * the UI can proceed optimistically.
 *
 * When offline AND the user is NOT `OFFLINE_ALLOWED`, the standard
 * `NetworkError` propagates — the same behavior as if no offline
 * middleware existed.
 *
 * Outbox replay is handled separately by the sync engine
 * (`db/outbox-sync.ts`), which drains pending mutations through
 * the FULL middleware pipeline (including auth → fresh token).
 *
 * Set `ctx.meta.skipOffline = true` to bypass offline queuing for a
 * specific request (e.g. real-time-only operations).
 *
 * @module http/middlewares/offline
 */

import { NetworkError } from '../types';

import type { OutboxAdapter } from './types';
import type { Middleware, RequestContext, ResponseContext } from '../types';
import type { PendingMutation } from '@/db/types';

// ── Options ─────────────────────────────────────────────────────────

/**
 * Configuration for the offline middleware.
 */
export interface OfflineMiddlewareOptions {
  /** Storage backend for pending mutations. */
  adapter: OutboxAdapter;
  /** Predicate that returns true when the browser is online. */
  onlinePredicate: () => boolean;
  /** Predicate that returns true when the user has OFFLINE_ALLOWED role. */
  isOfflineAllowed: () => boolean | Promise<boolean>;
  /** Async function that returns the current user's ID (OIDC sub). */
  getUserId: () => Promise<string | undefined>;
}

// ── Synthetic response ──────────────────────────────────────────────

/**
 * Builds a synthetic 202 Accepted response for a queued mutation.
 *
 * The 202 status tells the caller that the request was accepted for
 * processing but not yet completed.  The `meta.queuedOffline` flag
 * lets callers distinguish between a real server 202 and an offline
 * queue response.
 */
const buildQueuedResponse = (ctx: RequestContext): ResponseContext => ({
  data: { queued: true },
  status: 202,
  statusText: 'Accepted (queued offline)',
  headers: {},
  meta: { queuedOffline: true },
  config: ctx.config,
});

// ── Serialisation helpers ───────────────────────────────────────────

/**
 * Builds a PendingMutation from the request context.
 *
 * Headers and body are JSON-serialised for IDB storage.
 * Entity type and content ID are extracted from the URL path
 * using a simple convention: `/api/{plural}/{id}` → singular + id.
 */
const toPendingMutation = (ctx: RequestContext, userId: string): Omit<PendingMutation, 'id'> => {
  const url = ctx.config.url;
  const segments = url.split('/').filter(Boolean);

  // Convention: /api/{pluralEntity}/{id} or /api/{pluralEntity}
  // E.g. /api/users/42 → entityType='user', contentId='42'
  const pluralEntity = segments.length >= 2 ? segments[1] : '';
  const contentType = pluralEntity.endsWith('s') ? pluralEntity.slice(0, -1) : pluralEntity;
  const contentId = segments.length >= 3 ? segments[2] : '';

  return {
    userId,
    contentType,
    contentId,
    method: ctx.config.method as PendingMutation['method'],
    url,
    headers: JSON.stringify(ctx.config.headers ?? {}),
    body: JSON.stringify(ctx.config.data ?? null),
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };
};

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Creates an offline middleware with the given options.
 *
 * @param options - Offline configuration.
 * @returns A {@link Middleware} that queues mutations when offline.
 *
 * @example
 * ```ts
 * const offline = createOfflineMiddleware({
 *   adapter: outboxAdapter,
 *   onlinePredicate: () => navigator.onLine,
 *   isOfflineAllowed: () => checkOidcRole('OFFLINE_ALLOWED'),
 *   getUserId: async () => (await userManager.getUser())?.profile.sub,
 * });
 * ```
 */
export const createOfflineMiddleware = (options: OfflineMiddlewareOptions): Middleware => {
  const { adapter, onlinePredicate, isOfflineAllowed, getUserId } = options;

  const middleware: Middleware = async (ctx, next) => {
    // Only intercept mutations (non-GET requests).
    if (ctx.config.method === 'GET') {
      return next();
    }

    // If online, let the request through normally.
    if (onlinePredicate()) {
      return next();
    }

    // Allow callers to bypass offline queuing via meta.
    if (ctx.meta.skipOffline === true) {
      return next();
    }

    // Check if the user has the OFFLINE_ALLOWED role.
    const allowed = await isOfflineAllowed();
    if (!allowed) {
      // Not authorized for offline — propagate standard NetworkError.
      throw new NetworkError(
        'Network request failed — offline and not authorized for offline mode',
      );
    }

    // Queue the mutation to the outbox.
    const userId = await getUserId();
    if (!userId) {
      throw new NetworkError('Cannot queue offline mutation — no authenticated user');
    }

    const mutation = toPendingMutation(ctx, userId);
    await adapter.enqueue(mutation);

    return buildQueuedResponse(ctx);
  };

  return middleware;
};
