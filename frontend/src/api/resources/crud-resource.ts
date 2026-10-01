/**
 * MonoBlocks — CrudResource
 *
 * Generic CRUD resource for the domain-agnostic `entities` API. Every entity
 * type (customer, site, equipment, technician, work_order) shares the single
 * `/api/entities` collection and is discriminated by the `entity_type` query
 * parameter / request body field — there is no per-type collection path.
 *
 * REST mapping:
 *   list(query)        → GET    /api/entities?entity_type=...&status=...&page=...&size=...&sort=...
 *   get(id)            → GET    /api/entities/{id}            (entity + children)
 *   create(values)     → POST   /api/entities                 (201, body includes entity_type)
 *   update(id, values) → PATCH  /api/entities/{id}            (200)
 *   remove(id)         → DELETE /api/entities/{id}            (204, no body)
 *   related(id)        → composes entity + relationships + events
 *   checkUnique(...)   → GET    /api/entities/check-unique?entity_type=...
 *   listTypes()        → GET    /api/entities/types
 *
 * The API returns Spring's default `Page<T>` envelope; list and the detail
 * sub-resources are typed through it so deferred features can reuse the shape.
 */

import type { Transport } from '@/http/types';
import type {
  EntityEvent,
  EntityRecord,
  EntityType,
  RelatedResult,
  RelationResult,
  SortDef,
} from '@/schema/types';

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SORTABLE_COLUMNS,
  type EntityDetailWire,
  type EntityListQuery,
  type EntityRef,
  type EventWire,
  type Page,
  type RelationshipWire,
  type UniqueCheckWire,
} from '@/api/types';
import { Resource } from '@/http/resource';
import { get, has, relLabel } from '@/schema/helpers';

// ─── Response types ──────────────────────────────────────────────────────────

/** Shape returned by the `list` endpoint. */
export type ListResponse = Page<EntityRecord>;

/** Shape returned by the `related` helper. */
export type RelatedResponse = RelatedResult;

/** Shape returned by the `checkUnique` endpoint. */
export type UniqueCheckResponse = boolean;

// ─── Query building ──────────────────────────────────────────────────────────

/**
 * Translate the frontend list query into the backend's query parameters.
 *
 * `entity_type` is always sent; `page`/`size` default to the backend defaults.
 */
function buildListParams(type: EntityType, query: EntityListQuery): Record<string, unknown> {
  const params: Record<string, unknown> = {
    entity_type: type,
    page: query.page ?? 0,
    size: query.size ?? DEFAULT_PAGE_SIZE,
  };
  if (query.search) params.search = query.search;
  if (query.status) params.status = query.status;
  if (query.tag) params.tag = query.tag;
  if (query.geo) {
    params.lat = query.geo.lat;
    params.lng = query.geo.lng;
    params.radius_km = query.geo.radiusKm;
  }
  if (query.bbox) {
    params.min_lat = query.bbox.minLat;
    params.min_lng = query.bbox.minLng;
    params.max_lat = query.bbox.maxLat;
    params.max_lng = query.bbox.maxLng;
  }
  const sort = normalizeSort(query.sort);
  if (sort) params.sort = sort;
  return params;
}

/**
 * Convert a schema sort into Spring's `field,dir` form, dropping keys the
 * backend cannot sort by (attributes live in JSONB, not as JPA properties).
 */
function normalizeSort(sort?: SortDef): string | undefined {
  if (!sort?.key || !SORTABLE_COLUMNS.has(sort.key)) return undefined;
  return `${sort.key},${sort.dir === 'desc' ? 'desc' : 'asc'}`;
}

// ─── Detail composition helpers ──────────────────────────────────────────────

/** Build a displayable record from the stripped `other` reference shape. */
function refToRecord(type: EntityType, ref: EntityRef): EntityRecord {
  const titleField = get(type).titleField;
  return {
    id: ref.id,
    entity_type: type,
    name: ref.name,
    status: ref.status,
    [titleField]: ref.name,
  };
}

/**
 * Group relationship edges (and direct children) into the `RelationResult[]`
 * shape the detail screen already renders, keyed by direction + rel + type.
 */
function toRelationGroups(
  relationships: readonly RelationshipWire[],
  children: readonly EntityRef[],
): RelationResult[] {
  const groups = new Map<string, RelationResult>();
  const add = (
    direction: RelationResult['direction'],
    rel: string,
    type: EntityType,
    record: EntityRecord,
  ): void => {
    const key = `${direction}|${rel}|${type}`;
    let group = groups.get(key);
    if (!group) {
      group = { rel, direction, type, label: relLabel(rel, type), records: [] };
      groups.set(key, group);
    }
    if (!group.records.some((existing) => existing.id === record.id)) {
      group.records.push(record);
    }
  };

  for (const item of relationships) {
    const otherType = item.other.entity_type;
    if (!has(otherType)) continue;
    add(item.direction, item.relationship_type, otherType, refToRecord(otherType, item.other));
  }
  for (const child of children) {
    if (!has(child.entity_type)) continue;
    add('outbound', 'child', child.entity_type, refToRecord(child.entity_type, child));
  }
  return [...groups.values()];
}

/** Map the API event shape (`occurred_at`) onto the schema `EntityEvent`. */
function toEntityEvent(event: EventWire, fallbackType: EntityType): EntityEvent {
  return {
    id: event.id,
    entity_id: event.entity_id,
    entity_type: has(event.entity_type) ? event.entity_type : fallbackType,
    event_type: event.event_type,
    payload: event.payload ?? {},
    timestamp: event.occurred_at,
  };
}

/** Canonical `name` for entity types whose schema has no `name` field. */
function canonicalName(type: EntityType, values: Record<string, unknown>): string | undefined {
  const schema = get(type);
  if (schema.titleField === 'name') return undefined;
  const titleValue = values[schema.titleField];
  if (typeof titleValue === 'string' && titleValue.trim() !== '') return titleValue.trim();
  return schema.singular;
}

// ─── Sub-resource paging ─────────────────────────────────────────────────────

/**
 * Optional paging for the paginated entity sub-resources (`relationships`,
 * `events`).
 *
 * Omitted fields fall back to the backend defaults (page `0`, size `10`), so
 * callers that need a specific page or a larger page must pass them explicitly.
 */
export interface PageParams {
  /** Zero-based page index. @default 0 */
  page?: number;
  /** Page size; the backend caps this at {@link MAX_PAGE_SIZE}. @default 10 */
  size?: number;
}

// ─── CrudResource ────────────────────────────────────────────────────────────

/**
 * Generic CRUD resource for schema-driven entities.
 *
 * @typeparam T The entity record type (defaults to `EntityRecord`).
 */
export class CrudResource<T extends EntityRecord = EntityRecord> extends Resource<T> {
  /** Discriminator sent as `entity_type` on every request. */
  readonly entityType: EntityType;

  constructor(entityType: EntityType, transport: Transport) {
    super('/api/entities', transport);
    this.entityType = entityType;
  }

  // ─── CRUD operations ─────────────────────────────────────────────────────

  /**
   * List records with optional server-side search, filters, sort and paging.
   * Maps to `GET /api/entities`.
   */
  async list(query: EntityListQuery = {}): Promise<Page<T>> {
    return this.request<Page<T>>('GET', '', { params: buildListParams(this.entityType, query) });
  }

  /**
   * Create a record. `entity_type` is injected; attribute keys are merged
   * server-side. `name` is defaulted from the schema title field because the
   * backend requires it. Maps to `POST /api/entities`.
   */
  async create(values: Record<string, unknown>): Promise<T> {
    const body = this.writeBody(values);
    body.entity_type = this.entityType;
    if (body.name === undefined || body.name === '') {
      body.name = canonicalName(this.entityType, values) ?? get(this.entityType).singular;
    }
    return this.request<T>('POST', '', { data: body });
  }

  /**
   * Update a record (partial). Maps to `PATCH /api/entities/{id}`.
   */
  async update(id: string, values: Record<string, unknown>): Promise<T> {
    return this.request<T>('PATCH', id, { data: this.writeBody(values) });
  }

  /**
   * Delete a record. The API answers 204 with no body.
   * Maps to `DELETE /api/entities/{id}`.
   */
  async remove(id: string): Promise<void> {
    await this.request<unknown>('DELETE', id);
  }

  // ─── Lookups & sub-resources ─────────────────────────────────────────────

  /** Distinct entity types currently present. Maps to `GET /api/entities/types`. */
  async listTypes(): Promise<string[]> {
    return this.request<string[]>('GET', 'types');
  }

  /**
   * Paginated relationships for a record.
   * Maps to `GET /api/entities/{id}/relationships`.
   *
   * @param id - the record id
   * @param relationshipType - optional relationship type filter
   * @param pageParams - optional page index / size; omit for backend defaults
   */
  async relationships(
    id: string,
    relationshipType?: string,
    pageParams?: PageParams,
  ): Promise<Page<RelationshipWire>> {
    const params: Record<string, unknown> = {};
    if (relationshipType) params.relationship_type = relationshipType;
    if (pageParams?.page !== undefined) params.page = pageParams.page;
    if (pageParams?.size !== undefined) params.size = pageParams.size;
    return this.request<Page<RelationshipWire>>('GET', `${id}/relationships`, { params });
  }

  /**
   * Paginated events for a record.
   * Maps to `GET /api/entities/{id}/events`.
   *
   * @param id - the record id
   * @param pageParams - optional page index / size; omit for backend defaults
   */
  async events(id: string, pageParams?: PageParams): Promise<Page<EventWire>> {
    const params: Record<string, unknown> = {};
    if (pageParams?.page !== undefined) params.page = pageParams.page;
    if (pageParams?.size !== undefined) params.size = pageParams.size;
    const config = Object.keys(params).length > 0 ? { params } : undefined;
    return this.request<Page<EventWire>>('GET', `${id}/events`, config);
  }

  /**
   * Compose the detail view from the real endpoints: the entity (plus its
   * children) from `GET /api/entities/{id}`, its relationship edges and its
   * event history. The composed shape is unchanged for `DetailPage`.
   *
   * Both sub-resources are fetched at the backend max page size
   * ({@link MAX_PAGE_SIZE}) so the detail screen is not silently truncated to
   * the default first page of 10. Sets larger than {@link MAX_PAGE_SIZE} still
   * show only the first page — the detail screen has no further pagination.
   */
  async related(id: string): Promise<RelatedResult> {
    const [detail, relationships, events] = await Promise.all([
      this.request<EntityDetailWire>('GET', id),
      this.relationships(id, undefined, { size: MAX_PAGE_SIZE }),
      this.events(id, { size: MAX_PAGE_SIZE }),
    ]);
    return {
      record: detail,
      relations: toRelationGroups(relationships.content, detail.children?.content ?? []),
      events: events.content.map((event) => toEntityEvent(event, this.entityType)),
    };
  }

  /**
   * Check whether a registered attribute value is unique for this entity type.
   * Unregistered keys always report unique server-side.
   * Maps to `GET /api/entities/check-unique`.
   */
  async checkUnique(key: string, value: unknown, excludeId?: string): Promise<UniqueCheckResponse> {
    const params: Record<string, unknown> = {
      entity_type: this.entityType,
      key,
      value: String(value),
    };
    if (excludeId) params.excludeId = excludeId;
    const res = await this.request<UniqueCheckWire>('GET', 'check-unique', { params });
    return res.unique;
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  /**
   * Copy the values and, for entity types whose `name` is not the title field,
   * keep the canonical `name` column in sync with the title field.
   */
  private writeBody(values: Record<string, unknown>): Record<string, unknown> {
    const body = { ...values };
    const name = canonicalName(this.entityType, values);
    if (name !== undefined) body.name = name;
    return body;
  }
}
