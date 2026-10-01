/**
 * MonoBlocks — API resources barrel
 */

export {
  CrudResource,
  type ListResponse,
  type RelatedResponse,
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
