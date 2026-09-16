/**
 * MonoBlocks — schema/api.ts
 *
 * Schema helper functions. Port of prototype schema.js helpers.
 * All functions are pure and synchronous — no I/O.
 */

import { SCHEMA, TAG_MAPS } from './config.tsx';
import { ENTITY_TYPES } from './types.ts';

import type { EntityConfig, EntityRecord, EntityType, FieldDef, TagColor } from './types.ts';

/** Schema entry for an entity type. Throws on unknown types. */
export function get(type: EntityType): EntityConfig {
  return SCHEMA[type];
}

/** Whether the entity type is known. */
export function has(type: string): type is EntityType {
  return Object.prototype.hasOwnProperty.call(SCHEMA, type);
}

/** All entity type keys, in navigation order. */
export function types(): EntityType[] {
  return [...ENTITY_TYPES];
}

/** Look up a single field definition by key. Returns null if not found. */
export function field(type: EntityType, key: string): FieldDef | null {
  const fields = get(type).fields;
  return fields.find((f) => f.key === key) ?? null;
}

/** Fields shown as table columns (in schema order, excluding hiddenInList). */
export function listFields(type: EntityType): FieldDef[] {
  return get(type).fields.filter((f) => !f.hiddenInList);
}

/**
 * Display label for a stored option value.
 * "in_progress" → "In progress"; arrays → comma-joined; unknown → stringified; nullish → "—".
 */
export function optionLabel(f: FieldDef | null, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (f?.options) {
    const opt = f.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  if (Array.isArray(value)) {
    return value.map((v) => optionLabel(f, v)).join(', ');
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/**
 * Tag family for a status-like field, or null when untagged.
 * Falls back to 'gray' when the value isn't in the map.
 */
export function tagFamily(type: EntityType, key: string, value: string | null): TagColor | null {
  const map = TAG_MAPS[type][key];
  if (!map) return null;
  if (!value) return 'gray';
  return map[value] ?? 'gray';
}

/** Best human title for a record (used by links, refs, breadcrumbs). */
export function titleOf(type: EntityType, record: EntityRecord | null | undefined): string {
  if (!record) return '—';
  const key = get(type).titleField;
  return (record[key] as string) || record.id;
}

/**
 * Human-readable label for a relation name.
 * "belongs_to" → "Belongs to (customer)"
 */
export function relLabel(rel: string, targetType: EntityType): string {
  const singular = get(targetType).singular;
  const words: Record<string, string> = {
    belongs_to: 'Belongs to',
    installed_at: 'Installed at',
    assigned_to: 'Assigned to',
    for_site: 'For site',
    scheduled_at: 'Scheduled at',
  };
  return `${words[rel] || rel} (${singular.toLowerCase()})`;
}

/** Pluralized path segment for an entity type: "work_order" → "/work-orders". */
const PATH_SEGMENTS: Record<EntityType, string> = {
  customer: '/customers',
  site: '/sites',
  equipment: '/equipment',
  technician: '/technicians',
  work_order: '/work-orders',
};

export function entityPath(type: EntityType): string {
  return PATH_SEGMENTS[type];
}

/**
 * Build a link to an entity's list page.
 * "/customers" → "/customers"
 */
export function listPath(type: EntityType): string {
  return entityPath(type);
}

/**
 * Build a link to an entity's detail page.
 * "/customers/$id" → "/customers/cust-001"
 */
export function detailPath(type: EntityType, id: string): string {
  return `${entityPath(type)}/${id}`;
}

/**
 * Build a link to an entity's edit form.
 * "/customers/$id/edit" → "/customers/cust-001/edit"
 */
export function editPath(type: EntityType, id: string): string {
  return `${entityPath(type)}/${id}/edit`;
}

/**
 * Build a link to create a new entity.
 * "/customers/new" → "/customers/new"
 */
export function newPath(type: EntityType): string {
  return `${entityPath(type)}/new`;
}

/**
 * Build a link to an entity's delete confirmation.
 * "/customers/$id/delete" → "/customers/cust-001/delete"
 */
export function deletePath(type: EntityType, id: string): string {
  return `${entityPath(type)}/${id}/delete`;
}
