/**
 * MonoBlocks — Entity resource classes
 *
 * One Resource class per entity type. Each extends `CrudResource<T>` with
 * the correct base path. Domain-specific methods can be added here later
 * (e.g. work-order status transitions).
 */

import type { Transport } from '@/http/types';

import { CrudResource } from './crud-resource';
import type { EntityRecord } from '@/schema/types';

// ─── Customer ────────────────────────────────────────────────────────────────

export class CustomerResource extends CrudResource<EntityRecord> {
  constructor(transport: Transport) {
    super('customers', transport);
  }
}

// ─── Site ────────────────────────────────────────────────────────────────────

export class SiteResource extends CrudResource<EntityRecord> {
  constructor(transport: Transport) {
    super('sites', transport);
  }
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export class EquipmentResource extends CrudResource<EntityRecord> {
  constructor(transport: Transport) {
    super('equipment', transport);
  }
}

// ─── Technician ──────────────────────────────────────────────────────────────

export class TechnicianResource extends CrudResource<EntityRecord> {
  constructor(transport: Transport) {
    super('technicians', transport);
  }
}

// ─── Work Order ──────────────────────────────────────────────────────────────

export class WorkOrderResource extends CrudResource<EntityRecord> {
  constructor(transport: Transport) {
    super('work-orders', transport);
  }
}
