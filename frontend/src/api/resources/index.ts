/**
 * MonoBlocks — API resources barrel
 */

export {
  CrudResource,
  type DeleteResponse,
  type ListResponse,
  type RelatedResponse,
  type ResetResponse,
  type UniqueCheckResponse,
} from './crud-resource';
export {
  CustomerResource,
  SiteResource,
  EquipmentResource,
  TechnicianResource,
  WorkOrderResource,
} from './entity-resources';
export { getEntityResource, clearResourceCache } from './entity-resource-factory';
