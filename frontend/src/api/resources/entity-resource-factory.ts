/**
 * MonoBlocks — Entity resource factory
 *
 * Creates and caches `CrudResource` instances per entity type.
 * Uses the transport from the transport resolver, so the same
 * Resource pattern works against both mockDb and the real API.
 */

import { CrudResource } from './crud-resource';

import type { Transport } from '@/http/types';
import type { EntityType } from '@/schema/types';

import { getTransport } from '@/api/transport-resolver';

// ─── Resource cache ──────────────────────────────────────────────────────────

const resourceCache = new Map<EntityType, CrudResource>();

// ─── Path mapping ────────────────────────────────────────────────────────────

const BASE_PATHS: Record<EntityType, string> = {
  customer: 'customers',
  site: 'sites',
  equipment: 'equipment',
  technician: 'technicians',
  work_order: 'work-orders',
};

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Get a `CrudResource` for the given entity type.
 *
 * Resources are cached per type. When the transport changes
 * (e.g. from mock to real API), call `clearResourceCache()`
 * to force re-creation.
 */
export const getEntityResource = (type: EntityType, transport?: Transport): CrudResource => {
  const cached = resourceCache.get(type);
  if (cached && !transport) return cached;
  const t = transport ?? getTransport();
  const resource = new CrudResource(BASE_PATHS[type], t);
  resourceCache.set(type, resource);
  return resource;
};

/**
 * Clear the resource cache. Call when the transport changes.
 */
export const clearResourceCache = (): void => {
  resourceCache.clear();
};
