/**
 * MonoBlocks — schema/types.ts
 *
 * TypeScript types for the generic entity model. Adding an entity type is
 * config + data, never new screens (brief successCriteria #3).
 */

// ── Field types ────────────────────────────────────────────────────────────

export type FieldType =
  'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea' | 'multiselect';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  ref?: EntityType;
  required?: boolean;
  unique?: boolean;
  numeric?: boolean;
  mono?: boolean;
  location?: boolean;
  hiddenInList?: boolean;
  /** Show as a server-backed filter control in the list toolbar. */
  filterable?: boolean;
  /** Server-backed sortable column (the backend can only sort JPA columns). */
  sortable?: boolean;
  helper?: string;
}

// ── Entity config ──────────────────────────────────────────────────────────

export interface SortDef {
  key: string;
  dir: 'asc' | 'desc';
}

export interface RelationDef {
  rel: string;
  target: EntityType;
  field: string;
}

export interface EntityConfig {
  singular: string;
  plural: string;
  icon: string;
  titleField: string;
  idPrefix: string;
  defaultSort: SortDef;
  searchFields: string[];
  eventTypes: string[];
  relations?: RelationDef[];
  fields: FieldDef[];
}

// ── Tag maps ───────────────────────────────────────────────────────────────

export type TagColor = 'green' | 'gray' | 'blue' | 'purple' | 'red' | 'cyan';

// ── Entity types ───────────────────────────────────────────────────────────

export const ENTITY_TYPES = ['customer', 'site', 'equipment', 'technician', 'work_order'] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// ── Record shape ───────────────────────────────────────────────────────────

/** Minimal record shape — all entity records conform to at least this. */
export interface EntityRecord {
  id: string;
  entity_type: EntityType;
  [key: string]: unknown;
}

// ── Event ──────────────────────────────────────────────────────────────────

export interface EntityEvent {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ── API types ──────────────────────────────────────────────────────────────

/**
 * Options for the in-memory mock backend (`api/mockDb`). The live API uses
 * `EntityListQuery` from `api/types.ts` instead.
 */
export interface ListOptions {
  q?: string;
  filters?: Record<string, string>;
  sort?: SortDef;
}

export interface RelationResult {
  rel: string;
  direction: 'outbound' | 'inbound';
  type: EntityType;
  label: string;
  records: EntityRecord[];
}

export interface RelatedResult {
  record: EntityRecord;
  relations: RelationResult[];
  events: EntityEvent[];
}

// ── Store shape ────────────────────────────────────────────────────────────

/** Keys of DataStore that hold entity record collections (exclude version/events). */
export type CollectionKey = 'customers' | 'sites' | 'equipment' | 'technicians' | 'work_orders';

export interface DataStore {
  version: number;
  customers: EntityRecord[];
  sites: EntityRecord[];
  equipment: EntityRecord[];
  technicians: EntityRecord[];
  work_orders: EntityRecord[];
  events: EntityEvent[];
}
