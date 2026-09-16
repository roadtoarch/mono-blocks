/**
 * MonoBlocks — schema/config.ts
 *
 * Single source of truth for entity definitions. Port of prototype schema.js
 * TYPES + TAG_MAPS. Adding an entity type means editing this file + seed data.
 */

import { Dashboard, Document, Building, Tools, User } from '@carbon/icons-react';

import type { CollectionKey, EntityConfig, EntityType, TagColor } from './types.ts';
import type { ReactNode } from 'react';

// ── Entity configs ─────────────────────────────────────────────────────────

const customer: EntityConfig = {
  singular: 'Customer',
  plural: 'Customers',
  icon: 'user',
  titleField: 'name',
  idPrefix: 'cust',
  defaultSort: { key: 'name', dir: 'asc' },
  searchFields: ['name', 'billing_email', 'phone'],
  eventTypes: ['contract_renewed', 'tier_changed'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    {
      key: 'billing_email',
      label: 'Billing email',
      type: 'email',
      required: true,
      unique: true,
      mono: true,
      helper: 'Used for invoices. Must be unique across customers.',
    },
    { key: 'phone', label: 'Phone', type: 'tel', hiddenInList: true },
    {
      key: 'tier',
      label: 'Tier',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'premium', label: 'Premium' },
        { value: 'enterprise', label: 'Enterprise' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'prospective', label: 'Prospective' },
      ],
    },
    { key: 'contract_start', label: 'Contract start', type: 'date', mono: true },
  ],
};

const site: EntityConfig = {
  singular: 'Site',
  plural: 'Sites',
  icon: 'building',
  titleField: 'name',
  idPrefix: 'site',
  defaultSort: { key: 'name', dir: 'asc' },
  searchFields: ['name', 'address', 'city'],
  eventTypes: ['inspection_completed'],
  relations: [{ rel: 'belongs_to', target: 'customer', field: 'customer_id' }],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'customer_id', label: 'Customer', type: 'select', ref: 'customer', required: true },
    {
      key: 'address',
      label: 'Address',
      type: 'text',
      required: true,
      hiddenInList: true,
      location: true,
    },
    { key: 'city', label: 'City', type: 'text', required: true },
    {
      key: 'site_type',
      label: 'Site type',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'commercial', label: 'Commercial' },
        { value: 'residential', label: 'Residential' },
        { value: 'retail', label: 'Retail' },
      ],
    },
    {
      key: 'square_footage',
      label: 'Square footage',
      type: 'number',
      numeric: true,
      helper: 'Serviced floor area, in square feet.',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ],
};

const equipment: EntityConfig = {
  singular: 'Equipment',
  plural: 'Equipment',
  icon: 'tools',
  titleField: 'serial_number',
  idPrefix: 'equip',
  defaultSort: { key: 'serial_number', dir: 'asc' },
  searchFields: ['serial_number', 'location'],
  eventTypes: ['reading_recorded', 'service_completed', 'fault_reported'],
  relations: [{ rel: 'installed_at', target: 'site', field: 'site_id' }],
  fields: [
    {
      key: 'serial_number',
      label: 'Serial number',
      type: 'text',
      required: true,
      unique: true,
      mono: true,
      helper: 'Manufacturer serial. Must be unique.',
    },
    {
      key: 'equipment_type',
      label: 'Equipment type',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'hvac', label: 'HVAC' },
        { value: 'elevator', label: 'Elevator' },
        { value: 'boiler', label: 'Boiler' },
        { value: 'pump', label: 'Pump' },
        { value: 'generator', label: 'Generator' },
      ],
    },
    { key: 'site_id', label: 'Installed at', type: 'select', ref: 'site', required: true },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
      location: true,
      hiddenInList: true,
      helper: 'Placement within the site, e.g. Rooftop, north mechanical room.',
    },
    { key: 'install_date', label: 'Install date', type: 'date', mono: true, hiddenInList: true },
    { key: 'last_service_date', label: 'Last service', type: 'date', mono: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'operational', label: 'Operational' },
        { value: 'maintenance', label: 'Under maintenance' },
        { value: 'down', label: 'Down' },
      ],
    },
  ],
};

const technician: EntityConfig = {
  singular: 'Technician',
  plural: 'Technicians',
  icon: 'user',
  titleField: 'name',
  idPrefix: 'tech',
  defaultSort: { key: 'name', dir: 'asc' },
  searchFields: ['name', 'email', 'skills'],
  eventTypes: ['checked_in', 'certification_renewed'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      unique: true,
      mono: true,
      helper: 'Work email. Must be unique across technicians.',
    },
    { key: 'phone', label: 'Phone', type: 'tel', hiddenInList: true },
    {
      key: 'skills',
      label: 'Skills',
      type: 'multiselect',
      hiddenInList: true,
      options: [
        { value: 'hvac', label: 'HVAC' },
        { value: 'electrical', label: 'Electrical' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'elevator', label: 'Elevator' },
        { value: 'boiler', label: 'Boiler' },
        { value: 'generator', label: 'Generator' },
        { value: 'fire_safety', label: 'Fire safety' },
      ],
    },
    {
      key: 'certification_level',
      label: 'Certification level',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'I', label: 'Level I' },
        { value: 'II', label: 'Level II' },
        { value: 'III', label: 'Level III' },
        { value: 'master', label: 'Master' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'available', label: 'Available' },
        { value: 'on_job', label: 'On job' },
        { value: 'off', label: 'Off' },
      ],
    },
  ],
};

const work_order: EntityConfig = {
  singular: 'Work order',
  plural: 'Work orders',
  icon: 'document',
  titleField: 'title',
  idPrefix: 'wo',
  defaultSort: { key: 'scheduled_for', dir: 'desc' },
  searchFields: ['title', 'notes', 'location'],
  eventTypes: ['status_changed', 'assigned', 'note_added'],
  relations: [
    { rel: 'assigned_to', target: 'technician', field: 'technician_id' },
    { rel: 'for_site', target: 'site', field: 'site_id' },
  ],
  fields: [
    { key: 'title', label: 'Title', type: 'text', required: true },
    { key: 'site_id', label: 'Site', type: 'select', ref: 'site', required: true },
    {
      key: 'technician_id',
      label: 'Assigned technician',
      type: 'select',
      ref: 'technician',
      helper: 'Leave unassigned to schedule later.',
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'low', label: 'Low' },
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      filterable: true,
      options: [
        { value: 'open', label: 'Open' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    { key: 'scheduled_for', label: 'Scheduled for', type: 'date', required: true, mono: true },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
      location: true,
      hiddenInList: true,
      helper: 'Where on the site the work happens.',
    },
    { key: 'notes', label: 'Notes', type: 'textarea', hiddenInList: true },
  ],
};

// ── Config map ─────────────────────────────────────────────────────────────

export const SCHEMA: Record<EntityType, EntityConfig> = {
  customer,
  site,
  equipment,
  technician,
  work_order,
};

// ── Tag maps ───────────────────────────────────────────────────────────────
// value → TagColor. Undefined value → 'gray' (neutral).

export const TAG_MAPS: Record<
  EntityType,
  Partial<Record<string, Partial<Record<string, TagColor>>>>
> = {
  customer: {
    status: { active: 'green', inactive: 'gray', prospective: 'blue' },
    tier: { standard: 'gray', premium: 'blue', enterprise: 'purple' },
  },
  site: {
    status: { active: 'green', inactive: 'gray' },
  },
  equipment: {
    status: { operational: 'green', maintenance: 'blue', down: 'red' },
  },
  technician: {
    status: { available: 'green', on_job: 'blue', off: 'gray' },
  },
  work_order: {
    status: {
      open: 'blue',
      scheduled: 'cyan',
      in_progress: 'purple',
      completed: 'green',
      cancelled: 'red',
    },
    priority: { low: 'gray', normal: 'blue', high: 'purple', urgent: 'red' },
  },
};

// ── Store key map (entity type → localStorage collection key) ──────────────

export const STORE_KEYS: Record<EntityType, CollectionKey> = {
  customer: 'customers',
  site: 'sites',
  equipment: 'equipment',
  technician: 'technicians',
  work_order: 'work_orders',
};

// ── Navigation items (derived from schema) ─────────────────────────────────

export interface NavItem {
  key: EntityType | 'dashboard';
  label: string;
  icon: ReactNode;
  path: string;
}

/** Icon map: entity type / dashboard → Carbon icon component. */
const ICON_MAP: Record<EntityType | 'dashboard', ReactNode> = {
  dashboard: <Dashboard size={20} />,
  customer: <User size={20} />,
  site: <Building size={20} />,
  equipment: <Tools size={20} />,
  technician: <User size={20} />,
  work_order: <Document size={20} />,
};

/** All nav items in sidebar order. */
export function navItems(): NavItem[] {
  const pathMap: Record<EntityType, string> = {
    customer: '/customers',
    site: '/sites',
    equipment: '/equipment',
    technician: '/technicians',
    work_order: '/work-orders',
  };
  return [
    { key: 'dashboard', label: 'Dashboard', icon: ICON_MAP.dashboard, path: '/dashboard' },
    ...Object.entries(SCHEMA).map(([type, cfg]) => ({
      key: type as EntityType,
      label: cfg.plural,
      icon: ICON_MAP[type as EntityType],
      path: pathMap[type as EntityType],
    })),
  ];
}
