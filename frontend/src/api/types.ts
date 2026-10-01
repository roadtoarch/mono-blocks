/**
 * MonoBlocks — API envelope & wire-format types
 *
 * Types that describe what the generic core API actually returns over the wire,
 * rather than the schema-driven view models. Kept separate from `schema/types.ts`
 * so the pagination envelope and relationship/event payloads can be reused by
 * deferred features without pulling in schema config.
 *
 * The API uses Spring's default raw `PageImpl` serialization (a "direct"
 * envelope), so the summary fields (`content`, `number`, `size`,
 * `totalElements`, `totalPages`, `first`, `last`, `empty`, `numberOfElements`)
 * live at the top level — there is no `PagedModel` wrapper.
 */

import type { EntityRecord, SortDef } from '@/schema/types';

// ─── Pagination ──────────────────────────────────────────────────────────────

/** Spring Data `Sort` as serialized inside a `Page`. */
export interface SpringSort {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

/** Spring Data `Pageable` as serialized inside a `Page`. */
export interface Pageable {
  offset: number;
  pageNumber: number;
  pageSize: number;
  paged: boolean;
  unpaged: boolean;
  sort: SpringSort;
}

/**
 * Spring Data `Page<T>` wire envelope.
 *
 * Only the summary fields are part of the app's contract; `pageable` and
 * `sort` are modelled for completeness but never read by the UI.
 */
export interface Page<T> {
  content: T[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  pageable: Pageable;
  size: number;
  sort: SpringSort;
  totalElements: number;
  totalPages: number;
}

/** Default page size used by the backend and the list UI. */
export const DEFAULT_PAGE_SIZE = 10;

/** Maximum page size accepted by the backend (`size` max 100). */
export const MAX_PAGE_SIZE = 100;

/**
 * JPA properties the backend can actually sort by. Sort keys outside this set
 * are rejected by Spring Data with a 400, so the client only ever emits these.
 */
export const SORTABLE_COLUMNS: ReadonlySet<string> = new Set([
  'name',
  'status',
  'description',
  'createdAt',
  'updatedAt',
]);

// ─── List query ──────────────────────────────────────────────────────────────

/** Radius search around a point (all three values required together). */
export interface GeoFilter {
  lat: number;
  lng: number;
  radiusKm: number;
}

/** Bounding-box search (all four values required together). */
export interface BoundingBoxFilter {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Query parameters for `GET /api/entities`. */
export interface EntityListQuery {
  /** Server-side full-text search (tsvector), not a substring match. */
  search?: string;
  /** Exact status filter. */
  status?: string;
  /** Tag containment filter. */
  tag?: string;
  /** Radius geo filter. */
  geo?: GeoFilter;
  /** Bounding-box geo filter. */
  bbox?: BoundingBoxFilter;
  /** 0-based page number. */
  page?: number;
  /** Page size (max 100). */
  size?: number;
  /** Sort definition; non-column keys are dropped. */
  sort?: SortDef;
}

// ─── Relationship / event wire payloads ──────────────────────────────────────

/** Minimal reference to another entity, as embedded in relationship/detail payloads. */
export interface EntityRef {
  id: string;
  entity_type: string;
  name: string;
  status: string;
}

/** A relationship as returned by `GET /api/entities/{id}/relationships`. */
export interface RelationshipWire {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  attributes: Record<string, unknown> | null;
  created_at: string;
  direction: 'outbound' | 'inbound';
  other: EntityRef;
}

/** An event as returned by `GET /api/entities/{id}/events`. */
export interface EventWire {
  id: string;
  entity_id: string;
  entity_type: string;
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  occurred_at: string;
}

/** Response of `GET /api/entities/check-unique`. */
export interface UniqueCheckWire {
  unique: boolean;
}

/** `GET /api/entities/{id}` — the flattened entity plus its direct children. */
export type EntityDetailWire = EntityRecord & {
  children?: Page<EntityRef>;
};
