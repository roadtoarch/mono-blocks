/**
 * MonoBlocks — Entity resource classes
 *
 * One Resource class per entity type. Each extends `CrudResource<T>` with
 * the correct `entityType`. Domain-specific methods can be added here later
 * (e.g. work-order status transitions).
 */

import { CrudResource } from './crud-resource';

import type { Transport } from '@/http/types';

// ─── Customer ────────────────────────────────────────────────────────────────

export class CustomerResource extends CrudResource {
  constructor(transport: Transport) {
    super('customer', transport);
  }
}

// ─── Site ────────────────────────────────────────────────────────────────────

export class SiteResource extends CrudResource {
  constructor(transport: Transport) {
    super('site', transport);
  }
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export class EquipmentResource extends CrudResource {
  constructor(transport: Transport) {
    super('equipment', transport);
  }
}

// ─── Technician ──────────────────────────────────────────────────────────────

export class TechnicianResource extends CrudResource {
  constructor(transport: Transport) {
    super('technician', transport);
  }
}

// ─── Work Order ──────────────────────────────────────────────────────────────

export class WorkOrderResource extends CrudResource {
  constructor(transport: Transport) {
    super('work_order', transport);
  }
}
