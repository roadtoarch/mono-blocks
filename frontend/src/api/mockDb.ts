/**
 * MonoBlocks — api/mockDb.ts
 *
 * Mock backend simulating entity / relationship / event endpoints with
 * artificial latency (300–700ms randomized). Persistence: the store is
 * mirrored to localStorage['mb-data-v1'] on every mutation so demo CRUD
 * survives refresh; reset() restores the seeded dataset.
 *
 * API (all async, all reject with network-style errors when failNext):
 *   list(type, { q, filters, sort })      → EntityRecord[]
 *   get(type, id)                         → EntityRecord
 *   create(type, values)                  → EntityRecord
 *   update(type, id, values)              → EntityRecord
 *   remove(type, id)                      → { deleted: true, id }
 *   related(type, id)                     → RelatedResult
 *   checkUnique(type, key, value, exclId) → boolean
 *   reset()                               → { reset: true }
 *   failNext = true                       → next request rejects once
 */

import { seed, SEED_VERSION } from './seed.ts';

import type {
  DataStore,
  EntityEvent,
  EntityRecord,
  EntityType,
  ListOptions,
  RelatedResult,
  RelationResult,
  SortDef,
} from '@/schema/types.ts';

import { STORE_KEYS } from '@/schema/config.tsx';
import { get, relLabel, types } from '@/schema/helpers';

// ── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mb-data-v1';

// ── Internal state ─────────────────────────────────────────────────────────

let store: DataStore | null = null;
/** One-shot fail-next flag. Set to true → next request rejects. */
export let failNext = false;

// ── Helpers ────────────────────────────────────────────────────────────────

function clone<T>(v: T): T {
  return v === undefined ? v : structuredClone(v);
}

/** Type-safe accessor for entity record collections. */
function collection(data: DataStore, type: EntityType): EntityRecord[] {
  return data[STORE_KEYS[type]];
}

/** Safely stringify an unknown value (avoids no-base-to-string on Object). */
function safeStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => safeStr(v)).join(', ');
  return JSON.stringify(value);
}

function load(): DataStore {
  if (store) return store;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DataStore;
      if (parsed.version === SEED_VERSION) {
        store = parsed;
        return store;
      }
    }
  } catch {
    // corrupted or unavailable storage — fall through to seed
  }
  store = seed();
  save();
  return store;
}

function save(): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked — keep in memory
  }
}

// ── Simulation ─────────────────────────────────────────────────────────────

function delay(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 300 + Math.floor(Math.random() * 400));
  });
}

class NetworkError extends Error {
  override readonly name = 'NetworkError';
  constructor() {
    super('Network request failed: unable to reach the Cornerstone API (simulated).');
  }
}

class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
  constructor(type: EntityType, id: string) {
    super(`${get(type).singular} "${id}" was not found.`);
  }
}

/**
 * Wrap a handler in latency + the one-shot failNext error simulation.
 * Returns a Promise that resolves with the handler result or rejects.
 */
function request<T>(handler: () => T): Promise<T> {
  return delay().then(() => {
    if (failNext) {
      failNext = false;
      throw new NetworkError();
    }
    return handler();
  });
}

// ── ID generation ──────────────────────────────────────────────────────────

function nextId(type: EntityType): string {
  const prefix = get(type).idPrefix;
  const rows = collection(load(), type);
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.id.split('-')[1], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function nextEventId(): string {
  let max = 0;
  for (const e of load().events) {
    const n = parseInt(e.id.split('-')[1], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `evt-${String(max + 1).padStart(3, '0')}`;
}

// ── Event push ─────────────────────────────────────────────────────────────

function pushEvent(
  entityType: EntityType,
  entityId: string,
  eventType: string,
  payload: Record<string, unknown>,
): void {
  load().events.unshift({
    id: nextEventId(),
    entity_type: entityType,
    entity_id: entityId,
    event_type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  });
}

// ── Search ─────────────────────────────────────────────────────────────────

function matchesQuery(record: EntityRecord, type: EntityType, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return get(type).searchFields.some((key) => {
    const v = record[key];
    const val = Array.isArray(v) ? v.join(' ') : v;
    return val != null && safeStr(val).toLowerCase().includes(term);
  });
}

function matchesFilters(record: EntityRecord, filters?: Record<string, string>): boolean {
  if (!filters) return true;
  return Object.entries(filters).every(([key, want]) => {
    if (want === '') return true;
    return safeStr(record[key]) === want;
  });
}

function sortRows(rows: EntityRecord[], sort?: SortDef): EntityRecord[] {
  if (!sort?.key) return rows;
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    const as = av == null ? '' : safeStr(av).toLowerCase();
    const bs = bv == null ? '' : safeStr(bv).toLowerCase();
    if (as < bs) return -1 * dir;
    if (as > bs) return 1 * dir;
    return 0;
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

/** List records with optional search, filters, and sort. */
export const list = (type: EntityType, opts: ListOptions = {}): Promise<EntityRecord[]> => {
  return request(() => {
    const rows = collection(load(), type).map(clone);
    return sortRows(
      rows.filter((r) => matchesQuery(r, type, opts.q ?? '') && matchesFilters(r, opts.filters)),
      opts.sort ?? get(type).defaultSort,
    );
  });
};

/** Get a single record by ID. */
export const getRecord = (type: EntityType, id: string): Promise<EntityRecord> => {
  return request(() => {
    const row = collection(load(), type).find((r) => r.id === id);
    if (!row) throw new NotFoundError(type, id);
    return clone(row);
  });
};

/** Create a new record. */
export const create = (
  type: EntityType,
  values: Record<string, unknown>,
): Promise<EntityRecord> => {
  return request(() => {
    const record = clone(values) as EntityRecord;
    record.id = nextId(type);
    record.entity_type = type;
    collection(load(), type).push(record);
    save();
    return clone(record);
  });
};

/** Update an existing record. Logs events for work_order transitions. */
export const update = (
  type: EntityType,
  id: string,
  values: Record<string, unknown>,
): Promise<EntityRecord> => {
  return request(() => {
    const rows = collection(load(), type);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(type, id);
    const before = rows[idx];
    const next = { ...before, ...clone(values), id: before.id, entity_type: type };
    rows[idx] = next;
    // Timeline-worthy transitions
    if (type === 'work_order') {
      const beforeStatus = before.status as string | undefined;
      const nextStatus = next.status as string | undefined;
      if (beforeStatus !== nextStatus) {
        pushEvent(type, id, 'status_changed', { from: beforeStatus, to: nextStatus });
      }
      const beforeTech = before.technician_id as string | undefined;
      const nextTech = next.technician_id as string | undefined;
      if (beforeTech !== nextTech && nextTech) {
        pushEvent(type, id, 'assigned', { technician_id: nextTech });
      }
      const beforeNotes = before.notes as string | undefined;
      const nextNotes = next.notes as string | undefined;
      if (beforeNotes !== nextNotes) {
        pushEvent(type, id, 'note_added', { note: nextNotes });
      }
    }
    save();
    return clone(next);
  });
};

/** Delete a record and its events. */
export const remove = (
  type: EntityType,
  id: string,
): Promise<{
  deleted: true;
  id: string;
}> => {
  return request(() => {
    const data = load();
    const rows = collection(data, type);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundError(type, id);
    rows.splice(idx, 1);
    // Drop events so timelines never reference ghosts
    data.events = data.events.filter((e) => !(e.entity_type === type && e.entity_id === id));
    save();
    return { deleted: true, id };
  });
};

/**
 * Relations (outbound via schema + inbound reverse scan) and events.
 */
export const related = (type: EntityType, id: string): Promise<RelatedResult> => {
  return request(() => {
    const data = load();
    const record = collection(data, type).find((r) => r.id === id);
    if (!record) throw new NotFoundError(type, id);
    const rec = clone(record);
    const relations: RelationResult[] = [];
    const schema = get(type);
    // Outbound: relations this record points at
    for (const rel of schema.relations ?? []) {
      const targetId = rec[rel.field] as string | undefined;
      const targets = targetId ? collection(data, rel.target).filter((r) => r.id === targetId) : [];
      relations.push({
        rel: rel.rel,
        direction: 'outbound',
        type: rel.target,
        label: relLabel(rel.rel, rel.target),
        records: targets.map(clone),
      });
    }
    // Inbound: other entity types that point at this record
    for (const otherType of types()) {
      const other = get(otherType);
      for (const rel of other.relations ?? []) {
        if (rel.target !== type) continue;
        const found = collection(data, otherType).filter((r) => r[rel.field] === id);
        if (!found.length && otherType === type) continue;
        relations.push({
          rel: rel.rel,
          direction: 'inbound',
          type: otherType,
          label: other.plural,
          records: found.map(clone),
        });
      }
    }
    const events = data.events
      .filter((e) => e.entity_type === type && e.entity_id === id)
      .map(clone)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return { record: rec, relations, events };
  });
};

/** Check whether a value is unique for a field, excluding a specific ID. */
export const checkUnique = (
  type: EntityType,
  key: string,
  value: unknown,
  excludeId?: string,
): Promise<boolean> => {
  return request(() => {
    const norm = safeStr(value).trim().toLowerCase();
    if (!norm) return true;
    return !collection(load(), type).some(
      (r) => r.id !== excludeId && safeStr(r[key]).trim().toLowerCase() === norm,
    );
  });
};

/** Reset to seeded data. */
export const reset = (): Promise<{
  reset: true;
}> => {
  // Clear failNext before the request so reset always succeeds
  failNext = false;
  return request(() => {
    store = seed();
    save();
    return { reset: true };
  });
};

/** Set the failNext flag. */
export const setFailNext = (value: boolean): void => {
  failNext = value;
};

// ── Synchronous peek (for dashboard KPIs) ──────────────────────────────────

/** Synchronous read of the store (for dashboard KPI math). */
export const peek = (type: EntityType): EntityRecord[] => {
  return clone(collection(load(), type));
};

/** Synchronous read of all events. */
export const peekEvents = (): EntityEvent[] => {
  return clone(load().events);
};

/** Current seed version. */
export const seedVersion = SEED_VERSION;

// ── Warm the store on import ───────────────────────────────────────────────

load();
