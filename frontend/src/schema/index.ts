/**
 * MonoBlocks — schema/index.ts
 *
 * Barrel export for the schema module.
 */
export { SCHEMA, TAG_MAPS, STORE_KEYS, navItems } from './config.tsx';

export type { NavItem } from './config.tsx';
export {
  get,
  has,
  types,
  field,
  listFields,
  optionLabel,
  tagFamily,
  titleOf,
  relLabel,
  entityPath,
  listPath,
  detailPath,
  editPath,
  newPath,
  deletePath,
} from './helpers.ts';
export type {
  EntityType,
  EntityConfig,
  EntityRecord,
  EntityEvent,
  FieldDef,
  FieldOption,
  FieldType,
  SortDef,
  RelationDef,
  TagColor,
  ListOptions,
  RelationResult,
  RelatedResult,
  DataStore,
} from './types.ts';
export { ENTITY_TYPES } from './types.ts';
