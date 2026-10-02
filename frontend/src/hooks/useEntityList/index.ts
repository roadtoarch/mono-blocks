/**
 * MonoBlocks — hooks/useEntityList.ts
 *
 * TanStack Query hooks for the entity list page:
 * - useEntityList: fetches a filtered/sorted/paginated page of entity records
 * - useRefCaches: resolves foreign-key columns to display titles
 * - useInvalidateList: invalidation helper after mutations
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { EntityType, SortDef } from '@/schema/types';

import { getEntityResource } from '@/api/resources/entity-resource-factory';
import { MAX_PAGE_SIZE, type EntityListQuery } from '@/api/types';
import { get, listFields, titleOf } from '@/schema/helpers';

// ── Query key factory ─────────────────────────────────────────────────────

const listKey = (type: EntityType, query: EntityListQuery): unknown[] => ['list', type, query];

const refKey = (type: EntityType): unknown[] => ['ref-cache', type];

// ── Ref cache helper ──────────────────────────────────────────────────────

/** Single ref-type cache query. Returns id→title map. */
function useRefCache(type: EntityType | undefined): Record<string, string> {
  const { data = {} } = useQuery({
    queryKey: type ? refKey(type) : ['ref-cache', '__none__'],
    queryFn: async () => {
      if (!type) return {};
      const resource = getEntityResource(type);
      const page = await resource.list({ size: MAX_PAGE_SIZE });
      const map: Record<string, string> = {};
      for (const r of page.content) {
        map[r.id] = titleOf(type, r);
      }
      return map;
    },
    enabled: !!type,
    staleTime: 5 * 60 * 1000,
  });
  return data;
}

// ── Ref caches ────────────────────────────────────────────────────────────

/**
 * Preload ALL entity types that this entity type references via foreign keys
 * and return a map of refTypeName → { id → displayTitle }.
 *
 * The hook calls a fixed number of sub-hooks (2, padded) so the call count
 * is stable across entity types. This is safe because the schema is static.
 */
export const useRefCaches = (type: EntityType): Record<string, Record<string, string>> => {
  const fields = listFields(type);
  const refTypes: (EntityType | undefined)[] = [];
  const seen = new Set<EntityType>();
  for (const f of fields) {
    if (f.ref && !seen.has(f.ref)) {
      seen.add(f.ref);
      refTypes.push(f.ref);
    }
  }
  // Pad to exactly 2 entries for stable hook call count
  while (refTypes.length < 2) refTypes.push(undefined);
  const cache0 = useRefCache(refTypes[0]);
  const cache1 = useRefCache(refTypes[1]);
  const caches: Record<string, Record<string, string>> = {};
  if (refTypes[0]) caches[refTypes[0]] = cache0;
  if (refTypes[1]) caches[refTypes[1]] = cache1;
  return caches;
};

// ── Entity list hook ──────────────────────────────────────────────────────

export interface UseEntityListOptions {
  /** Server-side full-text search. */
  search?: string;
  /** Exact status filter. */
  status?: string;
  /** Tag containment filter. */
  tag?: string;
  /** 0-based page number. */
  page?: number;
  /** Page size (max 100). */
  size?: number;
  /** Sort definition; non-column keys are dropped by the resource. */
  sort?: SortDef;
}

/**
 * Fetch a filtered, sorted page of entity records.
 * Returns a TanStack Query result whose `data` is a Spring `Page<T>`.
 */
export const useEntityList = (type: EntityType, opts: UseEntityListOptions = {}) => {
  const query: EntityListQuery = {
    search: opts.search,
    status: opts.status,
    tag: opts.tag,
    page: opts.page,
    size: opts.size,
    sort: opts.sort ?? get(type).defaultSort,
  };
  return useQuery({
    queryKey: listKey(type, query),
    queryFn: () => getEntityResource(type).list(query),
  });
};

// ── Invalidation helper ───────────────────────────────────────────────────

/**
 * Return a function that invalidates list + ref-cache queries for a type.
 * Call after create/update/delete mutations.
 */
export const useInvalidateList = () => {
  const qc = useQueryClient();
  return (type: EntityType) => {
    void qc.invalidateQueries({ queryKey: ['list', type] });
    void qc.invalidateQueries({ queryKey: ['ref-cache', type] });
  };
};
