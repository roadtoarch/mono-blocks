/**
 * MonoBlocks — hooks/useEntityDetail.ts
 *
 * TanStack Query hook for the entity detail page. Fetches a single record
 * with its relations and events via the Resource pattern. Also provides
 * useDeleteEntity mutation and useInvalidateDetail invalidation helper.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { EntityType } from '@/schema/types';

import { getEntityResource } from '@/api/resources/entity-resource-factory';

// ── Query key factory ─────────────────────────────────────────────────────

const detailKey = (type: EntityType, id: string): unknown[] => ['detail', type, id];

// ── Entity detail hook ────────────────────────────────────────────────────

/**
 * Fetch a single record with its relations and events.
 * Returns TanStack Query result wrapping RelatedResult.
 */
export function useEntityDetail(type: EntityType, id: string) {
  return useQuery({
    queryKey: detailKey(type, id),
    queryFn: () => getEntityResource(type).related(id),
  });
}

// ── Delete mutation ───────────────────────────────────────────────────────

/**
 * Mutation to delete a record. On success, invalidates list + detail + ref
 * caches for the entity type so pages refresh.
 */
export function useDeleteEntity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }: { type: EntityType; id: string }) =>
      getEntityResource(type).remove(id),
    onSuccess: (_data, { type }) => {
      void qc.invalidateQueries({ queryKey: ['list', type] });
      void qc.invalidateQueries({ queryKey: ['detail', type] });
      void qc.invalidateQueries({ queryKey: ['ref-cache', type] });
    },
  });
}

// ── Invalidation helper ───────────────────────────────────────────────────

/**
 * Return a function that invalidates detail + list + ref-cache queries
 * for a type after create/update operations.
 */
export function useInvalidateDetail() {
  const qc = useQueryClient();
  return (type: EntityType, id?: string) => {
    void qc.invalidateQueries({ queryKey: ['detail', type, id] });
    void qc.invalidateQueries({ queryKey: ['list', type] });
    void qc.invalidateQueries({ queryKey: ['ref-cache', type] });
  };
}
