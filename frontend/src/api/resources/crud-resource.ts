/**
 * MonoBlocks — CrudResource
 *
 * Generic CRUD resource that maps the schema-driven entity API surface
 * to REST endpoints. Every entity type (customer, site, equipment,
 * technician, work_order) can use this base directly or extend it with
 * domain-specific methods.
 *
 * REST mapping:
 *   list()        → GET    /api/{basePath}?q=...&filters=...&sortKey=...&sortDir=...
 *   get(id)       → GET    /api/{basePath}/{id}
 *   create(body)  → POST   /api/{basePath}
 *   update(id, body) → PATCH  /api/{basePath}/{id}
 *   remove(id)    → DELETE /api/{basePath}/{id}
 *   related(id)   → GET    /api/{basePath}/{id}/related
 *   checkUnique(key, value, exclId?) → GET /api/{basePath}/check-unique?key=...&value=...[&excludeId=...]
 */

import type { Transport } from '@/http/types';
import type {
  EntityRecord,
  EntityEvent,
  ListOptions,
  RelatedResult,
  RelationResult,
} from '@/schema/types';

import { Resource } from '@/http/resource';

// ─── Response types ──────────────────────────────────────────────────────────

/** Shape returned by the `list` endpoint (matches mockDb output). */
export type ListResponse = EntityRecord[];

/** Shape returned by the `related` endpoint. */
export type RelatedResponse = RelatedResult;

/** Shape returned by the `remove` endpoint. */
export interface DeleteResponse {
  deleted: true;
  id: string;
}

/** Shape returned by the `checkUnique` endpoint. */
export type UniqueCheckResponse = boolean;

/** Shape returned by the `reset` endpoint (mock-only). */
export interface ResetResponse {
  reset: true;
}

// ─── CrudResource ────────────────────────────────────────────────────────────

/**
 * Generic CRUD resource for schema-driven entities.
 *
 * @typeparam T The entity record type (defaults to `EntityRecord`).
 */
export class CrudResource<T extends EntityRecord = EntityRecord> extends Resource<T> {
  constructor(basePath: string, transport: Transport) {
    super(`/api/${basePath}`, transport);
  }

  // ─── CRUD operations ─────────────────────────────────────────────────────

  /**
   * List records with optional search, filters, and sort.
   * Maps to `GET /api/{basePath}?q=...&sortKey=...&sortDir=...`
   */
  async list(opts: ListOptions = {}): Promise<ListResponse> {
    const params: Record<string, unknown> = {};

    if (opts.q) params.q = opts.q;
    if (opts.filters) {
      for (const [key, value] of Object.entries(opts.filters)) {
        if (value !== '') params[`filter.${key}`] = value;
      }
    }
    if (opts.sort) {
      params.sortKey = opts.sort.key;
      params.sortDir = opts.sort.dir;
    }

    return this.request<ListResponse>('GET', '', { params });
  }

  /**
   * Get a single record by ID.
   * Maps to `GET /api/{basePath}/{id}`
   */
  async get(id: string, config?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('GET', id, config);
  }

  /**
   * Create a new record.
   * Maps to `POST /api/{basePath}`
   */
  async create(values: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', '', { data: values });
  }

  /**
   * Update an existing record.
   * Maps to `PATCH /api/{basePath}/{id}`
   */
  async update(id: string, values: Record<string, unknown>): Promise<T> {
    const res = await this.request<T>('PATCH', id, { data: values });
    return res;
  }

  /**
   * Delete a record by ID.
   * Maps to `DELETE /api/{basePath}/{id}`
   */
  async remove(id: string): Promise<DeleteResponse> {
    const res = await this.request<DeleteResponse>('DELETE', id);
    return res;
  }

  // ─── Extended operations ─────────────────────────────────────────────────

  /**
   * Fetch a record with its relations and events.
   * Maps to `GET /api/{basePath}/{id}/related`
   */
  async related(id: string): Promise<RelatedResponse> {
    return this.request<RelatedResponse>('GET', `${id}/related`);
  }

  /**
   * Check whether a field value is unique, optionally excluding a specific ID.
   * Maps to `GET /api/{basePath}/check-unique?key=...&value=...[&excludeId=...]`
   */
  async checkUnique(key: string, value: unknown, excludeId?: string): Promise<UniqueCheckResponse> {
    const params: Record<string, unknown> = { key, value: String(value) };
    if (excludeId) params.excludeId = excludeId;

    return this.request<UniqueCheckResponse>('GET', 'check-unique', { params });
  }
}
