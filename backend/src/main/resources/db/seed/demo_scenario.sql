-- ---------------------------------------------------------------------------
-- Demo scenario seed: Northline Facilities Group (fictional).
-- Populates the generic pgcj entities / relationships / events core with a
-- realistic small-business dataset (customers, sites, equipment, technicians,
-- work orders, one relationship type, and an activity feed) so screens,
-- filters, and the activity feed have something to show.
--
-- Applied MANUALLY (never by Flyway):
--     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--       -f backend/src/main/resources/db/seed/demo_scenario.sql
--
-- This file is NOT a Flyway migration and MUST NOT be moved into
-- db/migration/. The integration test suite asserts exact table counts on a
-- freshly migrated database, so seed data must never run during tests.
--
-- Re-runnable: entities and relationships carry fixed UUID literals and use
-- ON CONFLICT DO NOTHING. Events have a surrogate bigserial id and no natural
-- key, so the whole batch is inserted only while pgcj.events is still empty
-- (a single WHERE NOT EXISTS guard); a second apply adds zero events. The file
-- runs in one transaction so a partial apply cannot leave half a dataset.
-- ---------------------------------------------------------------------------

BEGIN;

-- ---------------------------------------------------------------------------
-- entities: customers
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.entities (id, entity_type, parent_id, name, description, status, tags, attributes)
VALUES
    ('c0000000-0000-4000-8000-000000000001', 'customer', NULL, 'Harbourview Property Trust', 'Owner of the Granville and Coal Harbour towers.', 'active', ARRAY['landlord', 'premium'], '{"billing_email":"billing@harbourviewtrust.ca","phone":"+1-604-555-0101","tier":"premium","contract_start":"2021-03-01"}'::jsonb),
    ('c0000000-0000-4000-8000-000000000002', 'customer', NULL, 'False Creek Estates Ltd.', 'Mixed-use landlord across Vancouver and Kitsilano.', 'active', ARRAY['landlord', 'enterprise'], '{"billing_email":"accounts@falsecreekestates.ca","phone":"+1-604-555-0102","tier":"enterprise","contract_start":"2019-06-15"}'::jsonb),
    ('c0000000-0000-4000-8000-000000000003', 'customer', NULL, 'Maple Ridge Commercial Holdings', 'Owner of suburban retail and business-park assets.', 'active', ARRAY['retail', 'standard'], '{"billing_email":"ap@mapleridgecommercial.ca","phone":"+1-604-555-0103","tier":"standard","contract_start":"2023-01-10"}'::jsonb),
    ('c0000000-0000-4000-8000-000000000004', 'customer', NULL, 'Granville Island Retail Partners', 'Retail landlord; contract on hold pending renewal.', 'inactive', ARRAY['retail'], '{"billing_email":"billing@granvilleislandretail.ca","phone":"+1-604-555-0104","tier":"standard","contract_start":"2020-09-01"}'::jsonb),
    ('c0000000-0000-4000-8000-000000000005', 'customer', NULL, 'Burrard Inlet Ventures', 'Prospect evaluating a maintenance contract.', 'prospective', ARRAY['prospect', 'premium'], '{"billing_email":"finance@burrardinletventures.ca","phone":"+1-604-555-0105","tier":"premium","contract_start":"2026-10-01"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- entities: sites (all carry a Metro Vancouver coordinate)
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.entities (id, entity_type, parent_id, name, description, status, tags, location, attributes)
VALUES
    ('5b000000-0000-4000-8000-000000000001', 'site', 'c0000000-0000-4000-8000-000000000001', '200 Granville Tower', 'Downtown commercial tower.', 'active', ARRAY['downtown'], ST_SetSRID(ST_MakePoint(-123.1115, 49.2865), 4326)::geography, '{"address":"200 Granville St","city":"Vancouver","site_type":"commercial","square_footage":41000,"customer_id":"c0000000-0000-4000-8000-000000000001"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000002', 'site', 'c0000000-0000-4000-8000-000000000001', 'Harbourview Centre', 'Waterfront commercial complex.', 'active', ARRAY['waterfront'], ST_SetSRID(ST_MakePoint(-123.1110, 49.2887), 4326)::geography, '{"address":"999 Canada Pl","city":"Vancouver","site_type":"commercial","square_footage":52000,"customer_id":"c0000000-0000-4000-8000-000000000001"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000003', 'site', 'c0000000-0000-4000-8000-000000000002', 'False Creek Flats Depot', 'Light-industrial service depot.', 'active', ARRAY['industrial'], ST_SetSRID(ST_MakePoint(-123.0900, 49.2700), 4326)::geography, '{"address":"1200 Main St","city":"Vancouver","site_type":"commercial","square_footage":18000,"customer_id":"c0000000-0000-4000-8000-000000000002"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000004', 'site', 'c0000000-0000-4000-8000-000000000003', 'Maple Ridge Plaza', 'Suburban retail plaza.', 'active', ARRAY['retail'], ST_SetSRID(ST_MakePoint(-122.8800, 49.2200), 4326)::geography, '{"address":"22470 Dewdney Trunk Rd","city":"Maple Ridge","site_type":"retail","square_footage":26000,"customer_id":"c0000000-0000-4000-8000-000000000003"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000005', 'site', 'c0000000-0000-4000-8000-000000000005', 'Burrard Station Annex', 'Transit-adjacent office annex.', 'active', ARRAY['downtown'], ST_SetSRID(ST_MakePoint(-123.1200, 49.2850), 4326)::geography, '{"address":"601 Burrard St","city":"Vancouver","site_type":"commercial","square_footage":15000,"customer_id":"c0000000-0000-4000-8000-000000000005"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000006', 'site', 'c0000000-0000-4000-8000-000000000002', 'Kitsilano Lofts', 'Residential loft building.', 'active', ARRAY['residential'], ST_SetSRID(ST_MakePoint(-123.1680, 49.2680), 4326)::geography, '{"address":"1805 Larch St","city":"Vancouver","site_type":"residential","square_footage":12000,"customer_id":"c0000000-0000-4000-8000-000000000002"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000007', 'site', 'c0000000-0000-4000-8000-000000000004', 'Richmond Centre Retail', 'Retail centre; account inactive.', 'inactive', ARRAY['retail'], ST_SetSRID(ST_MakePoint(-123.1360, 49.1660), 4326)::geography, '{"address":"6551 No 3 Rd","city":"Richmond","site_type":"retail","square_footage":33000,"customer_id":"c0000000-0000-4000-8000-000000000004"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000008', 'site', 'c0000000-0000-4000-8000-000000000003', 'North Shore Business Park', 'North Vancouver business park.', 'active', ARRAY['industrial'], ST_SetSRID(ST_MakePoint(-123.0800, 49.3200), 4326)::geography, '{"address":"1370 Main St","city":"North Vancouver","site_type":"commercial","square_footage":29000,"customer_id":"c0000000-0000-4000-8000-000000000003"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000009', 'site', 'c0000000-0000-4000-8000-000000000001', 'Coal Harbour Residences', 'Waterfront residential tower.', 'active', ARRAY['residential'], ST_SetSRID(ST_MakePoint(-123.1300, 49.2900), 4326)::geography, '{"address":"1128 W Hastings St","city":"Vancouver","site_type":"residential","square_footage":21000,"customer_id":"c0000000-0000-4000-8000-000000000001"}'::jsonb),
    ('5b000000-0000-4000-8000-000000000010', 'site', 'c0000000-0000-4000-8000-000000000004', 'New Westminster Quay Offices', 'Quayside office block.', 'active', ARRAY['downtown'], ST_SetSRID(ST_MakePoint(-122.9100, 49.2000), 4326)::geography, '{"address":"810 Quayside Dr","city":"New Westminster","site_type":"commercial","square_footage":24000,"customer_id":"c0000000-0000-4000-8000-000000000004"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- entities: equipment (rooftop/field units carry a coordinate; in-plant kit
-- has a null location)
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.entities (id, entity_type, parent_id, name, description, status, tags, location, attributes)
VALUES
    ('e0000000-0000-4000-8000-000000000001', 'equipment', '5b000000-0000-4000-8000-000000000001', 'HVAC-RTU-1001', 'Rooftop HVAC unit.', 'operational', ARRAY['hvac', 'rooftop'], ST_SetSRID(ST_MakePoint(-123.1116, 49.2866), 4326)::geography, '{"serial_number":"HVAC-RTU-1001","equipment_type":"hvac","site_id":"5b000000-0000-4000-8000-000000000001","location_note":"Rooftop, north mechanical deck","install_date":"2019-05-20","last_service_date":"2026-08-12"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000002', 'equipment', '5b000000-0000-4000-8000-000000000001', 'ELEV-2001', 'Passenger elevator.', 'operational', ARRAY['elevator'], NULL, '{"serial_number":"ELEV-2001","equipment_type":"elevator","site_id":"5b000000-0000-4000-8000-000000000001","location_note":"Elevator machine room, core","install_date":"2015-02-01","last_service_date":"2026-07-30"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000003', 'equipment', '5b000000-0000-4000-8000-000000000002', 'BOIL-3001', 'Hot-water boiler.', 'maintenance', ARRAY['boiler'], NULL, '{"serial_number":"BOIL-3001","equipment_type":"boiler","site_id":"5b000000-0000-4000-8000-000000000002","location_note":"Basement plant room","install_date":"2013-11-15","last_service_date":"2026-08-05"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000004', 'equipment', '5b000000-0000-4000-8000-000000000002', 'PUMP-4001', 'Domestic water booster pump.', 'operational', ARRAY['pump'], ST_SetSRID(ST_MakePoint(-123.1112, 49.2888), 4326)::geography, '{"serial_number":"PUMP-4001","equipment_type":"pump","site_id":"5b000000-0000-4000-8000-000000000002","location_note":"P1 mechanical room","install_date":"2017-04-10","last_service_date":"2026-09-01"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000005', 'equipment', '5b000000-0000-4000-8000-000000000003', 'GEN-5001', 'Standby diesel generator.', 'operational', ARRAY['generator'], ST_SetSRID(ST_MakePoint(-123.0901, 49.2701), 4326)::geography, '{"serial_number":"GEN-5001","equipment_type":"generator","site_id":"5b000000-0000-4000-8000-000000000003","location_note":"Outdoor pad, east yard","install_date":"2020-08-22","last_service_date":"2026-08-28"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000006', 'equipment', '5b000000-0000-4000-8000-000000000003', 'HVAC-RTU-1002', 'Rooftop HVAC unit.', 'down', ARRAY['hvac', 'rooftop'], ST_SetSRID(ST_MakePoint(-123.0902, 49.2702), 4326)::geography, '{"serial_number":"HVAC-RTU-1002","equipment_type":"hvac","site_id":"5b000000-0000-4000-8000-000000000003","location_note":"Rooftop, south deck","install_date":"2018-06-30","last_service_date":"2026-09-10"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000007', 'equipment', '5b000000-0000-4000-8000-000000000004', 'HVAC-RTU-1003', 'Rooftop HVAC unit.', 'operational', ARRAY['hvac', 'rooftop'], ST_SetSRID(ST_MakePoint(-122.8801, 49.2201), 4326)::geography, '{"serial_number":"HVAC-RTU-1003","equipment_type":"hvac","site_id":"5b000000-0000-4000-8000-000000000004","location_note":"Rooftop, unit 3","install_date":"2021-01-18","last_service_date":"2026-07-22"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000008', 'equipment', '5b000000-0000-4000-8000-000000000004', 'PUMP-4002', 'Sump pump.', 'maintenance', ARRAY['pump'], ST_SetSRID(ST_MakePoint(-122.8802, 49.2202), 4326)::geography, '{"serial_number":"PUMP-4002","equipment_type":"pump","site_id":"5b000000-0000-4000-8000-000000000004","location_note":"Service corridor, level 1","install_date":"2016-09-09","last_service_date":"2026-08-19"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000009', 'equipment', '5b000000-0000-4000-8000-000000000005', 'ELEV-2002', 'Passenger elevator.', 'operational', ARRAY['elevator'], NULL, '{"serial_number":"ELEV-2002","equipment_type":"elevator","site_id":"5b000000-0000-4000-8000-000000000005","location_note":"Hoistway, west core","install_date":"2014-12-05","last_service_date":"2026-08-01"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000010', 'equipment', '5b000000-0000-4000-8000-000000000005', 'BOIL-3002', 'Hot-water boiler.', 'operational', ARRAY['boiler'], NULL, '{"serial_number":"BOIL-3002","equipment_type":"boiler","site_id":"5b000000-0000-4000-8000-000000000005","location_note":"Boiler room, B1","install_date":"2012-03-28","last_service_date":"2026-06-30"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000011', 'equipment', '5b000000-0000-4000-8000-000000000006', 'GEN-5002', 'Standby diesel generator.', 'down', ARRAY['generator'], ST_SetSRID(ST_MakePoint(-123.1681, 49.2681), 4326)::geography, '{"serial_number":"GEN-5002","equipment_type":"generator","site_id":"5b000000-0000-4000-8000-000000000006","location_note":"Parkade level P2","install_date":"2019-10-14","last_service_date":"2026-09-05"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000012', 'equipment', '5b000000-0000-4000-8000-000000000006', 'HVAC-RTU-1004', 'Rooftop HVAC unit.', 'operational', ARRAY['hvac', 'rooftop'], ST_SetSRID(ST_MakePoint(-123.1682, 49.2682), 4326)::geography, '{"serial_number":"HVAC-RTU-1004","equipment_type":"hvac","site_id":"5b000000-0000-4000-8000-000000000006","location_note":"Rooftop, east deck","install_date":"2020-02-20","last_service_date":"2026-08-15"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000013', 'equipment', '5b000000-0000-4000-8000-000000000007', 'ELEV-2003', 'Passenger elevator.', 'maintenance', ARRAY['elevator'], NULL, '{"serial_number":"ELEV-2003","equipment_type":"elevator","site_id":"5b000000-0000-4000-8000-000000000007","location_note":"Machine room, roof","install_date":"2013-07-07","last_service_date":"2026-07-11"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000014', 'equipment', '5b000000-0000-4000-8000-000000000007', 'PUMP-4003', 'Fire booster pump.', 'operational', ARRAY['pump'], ST_SetSRID(ST_MakePoint(-123.1361, 49.1661), 4326)::geography, '{"serial_number":"PUMP-4003","equipment_type":"pump","site_id":"5b000000-0000-4000-8000-000000000007","location_note":"Mechanical room, level B1","install_date":"2018-11-30","last_service_date":"2026-08-09"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000015', 'equipment', '5b000000-0000-4000-8000-000000000008', 'BOIL-3003', 'Condensing boiler.', 'operational', ARRAY['boiler'], NULL, '{"serial_number":"BOIL-3003","equipment_type":"boiler","site_id":"5b000000-0000-4000-8000-000000000008","location_note":"Boiler room, north wing","install_date":"2015-05-25","last_service_date":"2026-07-19"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000016', 'equipment', '5b000000-0000-4000-8000-000000000008', 'HVAC-RTU-1005', 'Rooftop HVAC unit.', 'operational', ARRAY['hvac', 'rooftop'], ST_SetSRID(ST_MakePoint(-123.0801, 49.3201), 4326)::geography, '{"serial_number":"HVAC-RTU-1005","equipment_type":"hvac","site_id":"5b000000-0000-4000-8000-000000000008","location_note":"Rooftop, south mechanical deck","install_date":"2021-09-12","last_service_date":"2026-09-02"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000017', 'equipment', '5b000000-0000-4000-8000-000000000009', 'GEN-5003', 'Standby diesel generator.', 'operational', ARRAY['generator'], ST_SetSRID(ST_MakePoint(-123.1301, 49.2901), 4326)::geography, '{"serial_number":"GEN-5003","equipment_type":"generator","site_id":"5b000000-0000-4000-8000-000000000009","location_note":"Parkade level P1","install_date":"2022-04-04","last_service_date":"2026-08-21"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000018', 'equipment', '5b000000-0000-4000-8000-000000000009', 'ELEV-2004', 'Passenger elevator.', 'down', ARRAY['elevator'], NULL, '{"serial_number":"ELEV-2004","equipment_type":"elevator","site_id":"5b000000-0000-4000-8000-000000000009","location_note":"Hoistway, east core","install_date":"2016-01-20","last_service_date":"2026-09-08"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000019', 'equipment', '5b000000-0000-4000-8000-000000000010', 'HVAC-RTU-1006', 'Rooftop HVAC unit.', 'maintenance', ARRAY['hvac', 'rooftop'], ST_SetSRID(ST_MakePoint(-122.9101, 49.2001), 4326)::geography, '{"serial_number":"HVAC-RTU-1006","equipment_type":"hvac","site_id":"5b000000-0000-4000-8000-000000000010","location_note":"Rooftop, west deck","install_date":"2019-08-16","last_service_date":"2026-08-27"}'::jsonb),
    ('e0000000-0000-4000-8000-000000000020', 'equipment', '5b000000-0000-4000-8000-000000000010', 'PUMP-4004', 'Domestic water booster pump.', 'operational', ARRAY['pump'], NULL, '{"serial_number":"PUMP-4004","equipment_type":"pump","site_id":"5b000000-0000-4000-8000-000000000010","location_note":"Mechanical room, level B1","install_date":"2017-12-11","last_service_date":"2026-07-25"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- entities: technicians
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.entities (id, entity_type, parent_id, name, description, status, tags, attributes)
VALUES
    ('7e000000-0000-4000-8000-000000000001', 'technician', NULL, 'Dana Whitfield', 'HVAC and controls specialist.', 'available', ARRAY['hvac', 'controls'], '{"email":"dana.whitfield@northline.ca","phone":"+1-604-555-0201","skills":["hvac","controls"],"certification_level":"III"}'::jsonb),
    ('7e000000-0000-4000-8000-000000000002', 'technician', NULL, 'Sam Ortega', 'Boiler and pump specialist.', 'on_job', ARRAY['boiler', 'pump'], '{"email":"sam.ortega@northline.ca","phone":"+1-604-555-0202","skills":["boiler","pump"],"certification_level":"II"}'::jsonb),
    ('7e000000-0000-4000-8000-000000000003', 'technician', NULL, 'Priya Nair', 'Elevator and safety lead.', 'available', ARRAY['elevator', 'safety'], '{"email":"priya.nair@northline.ca","phone":"+1-604-555-0203","skills":["elevator","safety"],"certification_level":"master"}'::jsonb),
    ('7e000000-0000-4000-8000-000000000004', 'technician', NULL, 'Marcus Lindqvist', 'Generator and electrical specialist.', 'off', ARRAY['generator', 'electrical'], '{"email":"marcus.lindqvist@northline.ca","phone":"+1-604-555-0204","skills":["generator","electrical"],"certification_level":"I"}'::jsonb),
    ('7e000000-0000-4000-8000-000000000005', 'technician', NULL, 'Renee Boucher', 'HVAC and refrigeration specialist.', 'on_job', ARRAY['hvac', 'refrigeration'], '{"email":"renee.boucher@northline.ca","phone":"+1-604-555-0205","skills":["hvac","refrigeration"],"certification_level":"II"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- entities: work orders (name column mirrors the `title` attribute; `site_id`
-- and `technician_id` attributes mirror parent_id and the assigned_to edge)
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.entities (id, entity_type, parent_id, name, description, status, tags, attributes)
VALUES
    ('40d00000-0000-4000-8000-000000000001', 'work_order', '5b000000-0000-4000-8000-000000000001', 'Quarterly HVAC service', 'Standard quarterly preventive maintenance.', 'scheduled', ARRAY['preventive'], '{"title":"Quarterly HVAC service","priority":"normal","scheduled_for":"2026-10-06","site_id":"5b000000-0000-4000-8000-000000000001","technician_id":"7e000000-0000-4000-8000-000000000001","location_note":"Rooftop, north mechanical deck","notes":"Standard quarterly preventive maintenance."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000002', 'work_order', '5b000000-0000-4000-8000-000000000001', 'Elevator annual inspection', 'Annual regulatory inspection.', 'completed', ARRAY['inspection'], '{"title":"Elevator annual inspection","priority":"normal","scheduled_for":"2026-08-18","site_id":"5b000000-0000-4000-8000-000000000001","technician_id":"7e000000-0000-4000-8000-000000000003","location_note":"Elevator machine room","notes":"Annual regulatory inspection."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000003', 'work_order', '5b000000-0000-4000-8000-000000000001', 'Boiler pressure check', 'Investigate intermittent pressure alarm.', 'open', ARRAY['boiler'], '{"title":"Boiler pressure check","priority":"high","scheduled_for":"2026-10-12","site_id":"5b000000-0000-4000-8000-000000000001","location_note":"Boiler room, B1","notes":"Investigate intermittent pressure alarm."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000004', 'work_order', '5b000000-0000-4000-8000-000000000002', 'Rooftop unit filter replacement', 'Replace filters on west rooftop unit.', 'in_progress', ARRAY['hvac', 'filters'], '{"title":"Rooftop unit filter replacement","priority":"normal","scheduled_for":"2026-09-29","site_id":"5b000000-0000-4000-8000-000000000002","technician_id":"7e000000-0000-4000-8000-000000000001","location_note":"Rooftop, west deck","notes":"Filters staged on site."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000005', 'work_order', '5b000000-0000-4000-8000-000000000002', 'Pump seal replacement', 'Replace worn mechanical seal.', 'scheduled', ARRAY['pump'], '{"title":"Pump seal replacement","priority":"high","scheduled_for":"2026-10-03","site_id":"5b000000-0000-4000-8000-000000000002","technician_id":"7e000000-0000-4000-8000-000000000002","location_note":"P1 mechanical room","notes":"Seal kit on order."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000006', 'work_order', '5b000000-0000-4000-8000-000000000003', 'Generator load bank test', 'Annual load bank test.', 'completed', ARRAY['generator'], '{"title":"Generator load bank test","priority":"normal","scheduled_for":"2026-08-25","site_id":"5b000000-0000-4000-8000-000000000003","technician_id":"7e000000-0000-4000-8000-000000000004","location_note":"East yard","notes":"Annual load bank test."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000007', 'work_order', '5b000000-0000-4000-8000-000000000003', 'HVAC compressor fault repair', 'Compressor replacement underway.', 'in_progress', ARRAY['hvac', 'repair'], '{"title":"HVAC compressor fault repair","priority":"urgent","scheduled_for":"2026-09-28","site_id":"5b000000-0000-4000-8000-000000000003","technician_id":"7e000000-0000-4000-8000-000000000005","location_note":"Rooftop, south deck","notes":"Compressor replacement underway."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000008', 'work_order', '5b000000-0000-4000-8000-000000000003', 'Quarterly HVAC service', 'Routine quarterly service.', 'open', ARRAY['preventive'], '{"title":"Quarterly HVAC service","priority":"normal","scheduled_for":"2026-10-15","site_id":"5b000000-0000-4000-8000-000000000003","location_note":"Rooftop, south deck","notes":"Routine service."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000009', 'work_order', '5b000000-0000-4000-8000-000000000004', 'Retail HVAC balancing', 'Balance airflows across retail floor.', 'scheduled', ARRAY['hvac'], '{"title":"Retail HVAC balancing","priority":"low","scheduled_for":"2026-10-09","site_id":"5b000000-0000-4000-8000-000000000004","technician_id":"7e000000-0000-4000-8000-000000000001","location_note":"Rooftop, unit 3","notes":"Balance airflows across retail floor."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000010', 'work_order', '5b000000-0000-4000-8000-000000000004', 'Pump vibration analysis', 'Cancelled by customer; reschedule Q4.', 'cancelled', ARRAY['pump'], '{"title":"Pump vibration analysis","priority":"low","scheduled_for":"2026-09-15","site_id":"5b000000-0000-4000-8000-000000000004","location_note":"Service corridor","notes":"Cancelled by customer; reschedule Q4."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000011', 'work_order', '5b000000-0000-4000-8000-000000000005', 'Elevator door alignment', 'Door tracking adjustment.', 'in_progress', ARRAY['elevator'], '{"title":"Elevator door alignment","priority":"normal","scheduled_for":"2026-09-30","site_id":"5b000000-0000-4000-8000-000000000005","technician_id":"7e000000-0000-4000-8000-000000000003","location_note":"West core","notes":"Door tracking adjustment."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000012', 'work_order', '5b000000-0000-4000-8000-000000000005', 'Boiler descaling', 'Descale heat exchanger.', 'open', ARRAY['boiler'], '{"title":"Boiler descaling","priority":"normal","scheduled_for":"2026-10-20","site_id":"5b000000-0000-4000-8000-000000000005","location_note":"Boiler room, B1","notes":"Descale heat exchanger."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000013', 'work_order', '5b000000-0000-4000-8000-000000000006', 'Generator fuel system service', 'Fuel line inspection and filter change.', 'scheduled', ARRAY['generator'], '{"title":"Generator fuel system service","priority":"normal","scheduled_for":"2026-10-07","site_id":"5b000000-0000-4000-8000-000000000006","technician_id":"7e000000-0000-4000-8000-000000000004","location_note":"Parkade P2","notes":"Fuel line inspection and filter change."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000014', 'work_order', '5b000000-0000-4000-8000-000000000006', 'HVAC refrigerant top-up', 'Topped up refrigerant charge.', 'completed', ARRAY['hvac'], '{"title":"HVAC refrigerant top-up","priority":"normal","scheduled_for":"2026-08-29","site_id":"5b000000-0000-4000-8000-000000000006","technician_id":"7e000000-0000-4000-8000-000000000005","location_note":"Rooftop, east deck","notes":"Topped up refrigerant."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000015', 'work_order', '5b000000-0000-4000-8000-000000000006', 'Rooftop unit belt replacement', 'Squealing belt reported.', 'open', ARRAY['hvac'], '{"title":"Rooftop unit belt replacement","priority":"low","scheduled_for":"2026-10-22","site_id":"5b000000-0000-4000-8000-000000000006","location_note":"Rooftop, east deck","notes":"Squealing belt reported."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000016', 'work_order', '5b000000-0000-4000-8000-000000000007', 'Elevator modernization quote', 'Scope and quote for modernization.', 'open', ARRAY['elevator', 'quote'], '{"title":"Elevator modernization quote","priority":"normal","scheduled_for":"2026-10-18","site_id":"5b000000-0000-4000-8000-000000000007","technician_id":"7e000000-0000-4000-8000-000000000003","location_note":"Machine room","notes":"Scope and quote for modernization."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000017', 'work_order', '5b000000-0000-4000-8000-000000000007', 'Pump bearing replacement', 'Bearing wear detected.', 'scheduled', ARRAY['pump'], '{"title":"Pump bearing replacement","priority":"high","scheduled_for":"2026-10-01","site_id":"5b000000-0000-4000-8000-000000000007","technician_id":"7e000000-0000-4000-8000-000000000002","location_note":"Mechanical room B1","notes":"Bearing wear detected."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000018', 'work_order', '5b000000-0000-4000-8000-000000000008', 'Boiler combustion analysis', 'Combustion tuning completed.', 'completed', ARRAY['boiler'], '{"title":"Boiler combustion analysis","priority":"normal","scheduled_for":"2026-08-20","site_id":"5b000000-0000-4000-8000-000000000008","technician_id":"7e000000-0000-4000-8000-000000000002","location_note":"Boiler room, north wing","notes":"Combustion tuning."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000019', 'work_order', '5b000000-0000-4000-8000-000000000008', 'HVAC seasonal startup', 'Heat season startup.', 'scheduled', ARRAY['hvac'], '{"title":"HVAC seasonal startup","priority":"normal","scheduled_for":"2026-10-05","site_id":"5b000000-0000-4000-8000-000000000008","technician_id":"7e000000-0000-4000-8000-000000000001","location_note":"Rooftop, south deck","notes":"Heat season startup."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000020', 'work_order', '5b000000-0000-4000-8000-000000000008', 'Rooftop unit fault diagnosis', 'Intermittent lockout fault.', 'in_progress', ARRAY['hvac', 'diagnostic'], '{"title":"Rooftop unit fault diagnosis","priority":"high","scheduled_for":"2026-09-26","site_id":"5b000000-0000-4000-8000-000000000008","technician_id":"7e000000-0000-4000-8000-000000000005","location_note":"Rooftop, south deck","notes":"Intermittent lockout fault."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000021', 'work_order', '5b000000-0000-4000-8000-000000000009', 'Generator monthly run test', 'Monthly exercise run.', 'completed', ARRAY['generator'], '{"title":"Generator monthly run test","priority":"low","scheduled_for":"2026-08-31","site_id":"5b000000-0000-4000-8000-000000000009","technician_id":"7e000000-0000-4000-8000-000000000004","location_note":"Parkade P1","notes":"Monthly exercise run."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000022', 'work_order', '5b000000-0000-4000-8000-000000000009', 'Elevator emergency phone test', 'Cancelled; code test moved.', 'cancelled', ARRAY['elevator'], '{"title":"Elevator emergency phone test","priority":"low","scheduled_for":"2026-09-12","site_id":"5b000000-0000-4000-8000-000000000009","location_note":"East core","notes":"Cancelled; code test moved."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000023', 'work_order', '5b000000-0000-4000-8000-000000000010', 'HVAC quarterly service', 'Routine quarterly service.', 'open', ARRAY['preventive'], '{"title":"HVAC quarterly service","priority":"normal","scheduled_for":"2026-10-14","site_id":"5b000000-0000-4000-8000-000000000010","technician_id":"7e000000-0000-4000-8000-000000000001","location_note":"Rooftop, west deck","notes":"Routine service."}'::jsonb),
    ('40d00000-0000-4000-8000-000000000024', 'work_order', '5b000000-0000-4000-8000-000000000010', 'Pump impeller inspection', 'Inspect impeller for wear.', 'scheduled', ARRAY['pump'], '{"title":"Pump impeller inspection","priority":"normal","scheduled_for":"2026-10-08","site_id":"5b000000-0000-4000-8000-000000000010","technician_id":"7e000000-0000-4000-8000-000000000002","location_note":"Mechanical room B1","notes":"Inspect impeller for wear."}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- relationships: assigned_to (work_order -> technician). The only typed edge
-- in this scenario; not a containment, so it is not modelled as parent_id.
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.relationships (id, source_id, target_id, relationship_type, attributes)
VALUES
    ('4e000000-0000-4000-8000-000000000001', '40d00000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000002', '40d00000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000003', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000003', '40d00000-0000-4000-8000-000000000004', '7e000000-0000-4000-8000-000000000001', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000004', '40d00000-0000-4000-8000-000000000005', '7e000000-0000-4000-8000-000000000002', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000005', '40d00000-0000-4000-8000-000000000006', '7e000000-0000-4000-8000-000000000004', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000006', '40d00000-0000-4000-8000-000000000007', '7e000000-0000-4000-8000-000000000005', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000007', '40d00000-0000-4000-8000-000000000009', '7e000000-0000-4000-8000-000000000001', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000008', '40d00000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000003', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000009', '40d00000-0000-4000-8000-000000000013', '7e000000-0000-4000-8000-000000000004', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000010', '40d00000-0000-4000-8000-000000000014', '7e000000-0000-4000-8000-000000000005', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000011', '40d00000-0000-4000-8000-000000000016', '7e000000-0000-4000-8000-000000000003', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000012', '40d00000-0000-4000-8000-000000000017', '7e000000-0000-4000-8000-000000000002', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000013', '40d00000-0000-4000-8000-000000000018', '7e000000-0000-4000-8000-000000000002', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000014', '40d00000-0000-4000-8000-000000000019', '7e000000-0000-4000-8000-000000000001', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000015', '40d00000-0000-4000-8000-000000000020', '7e000000-0000-4000-8000-000000000005', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000016', '40d00000-0000-4000-8000-000000000021', '7e000000-0000-4000-8000-000000000004', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000017', '40d00000-0000-4000-8000-000000000023', '7e000000-0000-4000-8000-000000000001', 'assigned_to', '{}'::jsonb),
    ('4e000000-0000-4000-8000-000000000018', '40d00000-0000-4000-8000-000000000024', '7e000000-0000-4000-8000-000000000002', 'assigned_to', '{}'::jsonb)
ON CONFLICT ON CONSTRAINT uq_relationship DO NOTHING;

-- ---------------------------------------------------------------------------
-- events: activity feed spread over the last 60 days.
--
-- Idempotency: events have a surrogate bigserial id and no natural key, so
-- ON CONFLICT cannot apply. The batch is inserted only while the table is
-- empty; the WHERE NOT EXISTS guard is evaluated against a single statement
-- snapshot, so the batch is all-or-nothing. A second apply inserts zero rows.
-- actor_id is a technician UUID for field events and null for system-ish ones.
-- ---------------------------------------------------------------------------
INSERT INTO pgcj.events (entity_id, actor_id, event_type, payload, occurred_at)
SELECT
    v.entity_id::uuid,
    v.actor_id::uuid,
    v.event_type,
    v.payload,
    v.occurred_at
FROM (VALUES
    -- customer (system-ish, actor null)
    ('c0000000-0000-4000-8000-000000000001', NULL, 'contract_renewed', '{"term_months":24,"annual_value":84000}'::jsonb, now() - interval '52 days'),
    ('c0000000-0000-4000-8000-000000000002', NULL, 'contract_renewed', '{"term_months":36,"annual_value":126000}'::jsonb, now() - interval '41 days'),
    ('c0000000-0000-4000-8000-000000000003', NULL, 'tier_changed', '{"from":"standard","to":"premium"}'::jsonb, now() - interval '33 days'),
    ('c0000000-0000-4000-8000-000000000004', NULL, 'tier_changed', '{"from":"premium","to":"standard"}'::jsonb, now() - interval '20 days'),
    ('c0000000-0000-4000-8000-000000000005', NULL, 'contract_renewed', '{"term_months":12,"annual_value":36000}'::jsonb, now() - interval '7 days'),
    -- site (inspection reports, actor null)
    ('5b000000-0000-4000-8000-000000000001', NULL, 'inspection_completed', '{"inspector":"Dana Whitfield","score":92,"findings":1}'::jsonb, now() - interval '55 days'),
    ('5b000000-0000-4000-8000-000000000003', NULL, 'inspection_completed', '{"inspector":"Priya Nair","score":88,"findings":2}'::jsonb, now() - interval '44 days'),
    ('5b000000-0000-4000-8000-000000000005', NULL, 'inspection_completed', '{"inspector":"Sam Ortega","score":95,"findings":0}'::jsonb, now() - interval '30 days'),
    ('5b000000-0000-4000-8000-000000000008', NULL, 'inspection_completed', '{"inspector":"Renee Boucher","score":79,"findings":3}'::jsonb, now() - interval '16 days'),
    ('5b000000-0000-4000-8000-000000000010', NULL, 'inspection_completed', '{"inspector":"Dana Whitfield","score":90,"findings":1}'::jsonb, now() - interval '4 days'),
    -- equipment: readings (field, actor = technician)
    ('e0000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'reading_recorded', '{"metric":"pressure_psi","value":61.4,"unit":"psi"}'::jsonb, now() - interval '58 days'),
    ('e0000000-0000-4000-8000-000000000004', '7e000000-0000-4000-8000-000000000002', 'reading_recorded', '{"metric":"flow_gpm","value":120.0,"unit":"gpm"}'::jsonb, now() - interval '50 days'),
    ('e0000000-0000-4000-8000-000000000005', '7e000000-0000-4000-8000-000000000004', 'reading_recorded', '{"metric":"fuel_level_pct","value":78.0,"unit":"pct"}'::jsonb, now() - interval '43 days'),
    ('e0000000-0000-4000-8000-000000000007', '7e000000-0000-4000-8000-000000000001', 'reading_recorded', '{"metric":"supply_temp_c","value":21.5,"unit":"c"}'::jsonb, now() - interval '36 days'),
    ('e0000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000004', 'reading_recorded', '{"metric":"voltage_v","value":13.8,"unit":"v"}'::jsonb, now() - interval '28 days'),
    ('e0000000-0000-4000-8000-000000000014', '7e000000-0000-4000-8000-000000000002', 'reading_recorded', '{"metric":"pressure_psi","value":58.2,"unit":"psi"}'::jsonb, now() - interval '21 days'),
    ('e0000000-0000-4000-8000-000000000016', '7e000000-0000-4000-8000-000000000001', 'reading_recorded', '{"metric":"discharge_temp_c","value":7.1,"unit":"c"}'::jsonb, now() - interval '12 days'),
    ('e0000000-0000-4000-8000-000000000019', '7e000000-0000-4000-8000-000000000005', 'reading_recorded', '{"metric":"vibration_mm_s","value":2.4,"unit":"mm/s"}'::jsonb, now() - interval '5 days'),
    -- equipment: service completed (field, actor = technician)
    ('e0000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'service_completed', '{"work_order_id":"40d00000-0000-4000-8000-000000000001","technician":"Dana Whitfield"}'::jsonb, now() - interval '49 days'),
    ('e0000000-0000-4000-8000-000000000004', '7e000000-0000-4000-8000-000000000001', 'service_completed', '{"work_order_id":"40d00000-0000-4000-8000-000000000004","technician":"Dana Whitfield"}'::jsonb, now() - interval '40 days'),
    ('e0000000-0000-4000-8000-000000000006', '7e000000-0000-4000-8000-000000000005', 'service_completed', '{"work_order_id":"40d00000-0000-4000-8000-000000000007","technician":"Renee Boucher"}'::jsonb, now() - interval '34 days'),
    ('e0000000-0000-4000-8000-000000000013', '7e000000-0000-4000-8000-000000000005', 'service_completed', '{"work_order_id":"40d00000-0000-4000-8000-000000000014","technician":"Renee Boucher"}'::jsonb, now() - interval '24 days'),
    ('e0000000-0000-4000-8000-000000000015', '7e000000-0000-4000-8000-000000000002', 'service_completed', '{"work_order_id":"40d00000-0000-4000-8000-000000000018","technician":"Sam Ortega"}'::jsonb, now() - interval '15 days'),
    ('e0000000-0000-4000-8000-000000000017', '7e000000-0000-4000-8000-000000000004', 'service_completed', '{"work_order_id":"40d00000-0000-4000-8000-000000000021","technician":"Marcus Lindqvist"}'::jsonb, now() - interval '8 days'),
    -- equipment: fault reported (field, actor = technician)
    ('e0000000-0000-4000-8000-000000000006', '7e000000-0000-4000-8000-000000000005', 'fault_reported', '{"severity":"high","code":"E-204","description":"Coolant pressure below threshold"}'::jsonb, now() - interval '38 days'),
    ('e0000000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000004', 'fault_reported', '{"severity":"critical","code":"G-101","description":"Generator failed to start on test"}'::jsonb, now() - interval '26 days'),
    ('e0000000-0000-4000-8000-000000000018', '7e000000-0000-4000-8000-000000000003', 'fault_reported', '{"severity":"high","code":"L-330","description":"Elevator door interlock fault"}'::jsonb, now() - interval '18 days'),
    ('e0000000-0000-4000-8000-000000000003', '7e000000-0000-4000-8000-000000000002', 'fault_reported', '{"severity":"medium","code":"B-212","description":"Boiler short-cycling on low load"}'::jsonb, now() - interval '9 days'),
    -- technician: check-ins (field, actor = that technician)
    ('7e000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'checked_in', '{"site_id":"5b000000-0000-4000-8000-000000000001","lat":49.2865,"lng":-123.1115}'::jsonb, now() - interval '57 days'),
    ('7e000000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'checked_in', '{"site_id":"5b000000-0000-4000-8000-000000000003","lat":49.2700,"lng":-123.0900}'::jsonb, now() - interval '45 days'),
    ('7e000000-0000-4000-8000-000000000005', '7e000000-0000-4000-8000-000000000005', 'checked_in', '{"site_id":"5b000000-0000-4000-8000-000000000003","lat":49.2700,"lng":-123.0900}'::jsonb, now() - interval '39 days'),
    ('7e000000-0000-4000-8000-000000000003', '7e000000-0000-4000-8000-000000000003', 'checked_in', '{"site_id":"5b000000-0000-4000-8000-000000000005","lat":49.2850,"lng":-123.1200}'::jsonb, now() - interval '27 days'),
    ('7e000000-0000-4000-8000-000000000002', '7e000000-0000-4000-8000-000000000002', 'checked_in', '{"site_id":"5b000000-0000-4000-8000-000000000008","lat":49.3200,"lng":-123.0800}'::jsonb, now() - interval '14 days'),
    ('7e000000-0000-4000-8000-000000000004', '7e000000-0000-4000-8000-000000000004', 'checked_in', '{"site_id":"5b000000-0000-4000-8000-000000000009","lat":49.2900,"lng":-123.1300}'::jsonb, now() - interval '6 days'),
    -- technician: certification renewals (system-ish, actor null)
    ('7e000000-0000-4000-8000-000000000002', NULL, 'certification_renewed', '{"certification":"Refrigeration","expires_on":"2028-04-01"}'::jsonb, now() - interval '47 days'),
    ('7e000000-0000-4000-8000-000000000003', NULL, 'certification_renewed', '{"certification":"Elevator Safety","expires_on":"2029-01-15"}'::jsonb, now() - interval '29 days'),
    ('7e000000-0000-4000-8000-000000000004', NULL, 'certification_renewed', '{"certification":"Electrical Systems","expires_on":"2028-11-30"}'::jsonb, now() - interval '11 days'),
    -- work_order: status changes (actor = technician when a tech drove it)
    ('40d00000-0000-4000-8000-000000000001', NULL, 'status_changed', '{"from":"open","to":"scheduled"}'::jsonb, now() - interval '60 days'),
    ('40d00000-0000-4000-8000-000000000004', '7e000000-0000-4000-8000-000000000001', 'status_changed', '{"from":"scheduled","to":"in_progress"}'::jsonb, now() - interval '42 days'),
    ('40d00000-0000-4000-8000-000000000006', '7e000000-0000-4000-8000-000000000004', 'status_changed', '{"from":"in_progress","to":"completed"}'::jsonb, now() - interval '35 days'),
    ('40d00000-0000-4000-8000-000000000007', '7e000000-0000-4000-8000-000000000005', 'status_changed', '{"from":"scheduled","to":"in_progress"}'::jsonb, now() - interval '25 days'),
    ('40d00000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000003', 'status_changed', '{"from":"open","to":"in_progress"}'::jsonb, now() - interval '22 days'),
    ('40d00000-0000-4000-8000-000000000014', '7e000000-0000-4000-8000-000000000005', 'status_changed', '{"from":"scheduled","to":"completed"}'::jsonb, now() - interval '17 days'),
    ('40d00000-0000-4000-8000-000000000018', '7e000000-0000-4000-8000-000000000002', 'status_changed', '{"from":"in_progress","to":"completed"}'::jsonb, now() - interval '13 days'),
    ('40d00000-0000-4000-8000-000000000020', '7e000000-0000-4000-8000-000000000005', 'status_changed', '{"from":"open","to":"in_progress"}'::jsonb, now() - interval '11 days'),
    ('40d00000-0000-4000-8000-000000000021', '7e000000-0000-4000-8000-000000000004', 'status_changed', '{"from":"scheduled","to":"completed"}'::jsonb, now() - interval '10 days'),
    ('40d00000-0000-4000-8000-000000000022', NULL, 'status_changed', '{"from":"scheduled","to":"cancelled"}'::jsonb, now() - interval '10 days'),
    ('40d00000-0000-4000-8000-000000000009', NULL, 'status_changed', '{"from":"open","to":"scheduled"}'::jsonb, now() - interval '9 days'),
    ('40d00000-0000-4000-8000-000000000010', NULL, 'status_changed', '{"from":"scheduled","to":"cancelled"}'::jsonb, now() - interval '8 days'),
    -- work_order: assignments (dispatcher action, actor null)
    ('40d00000-0000-4000-8000-000000000001', NULL, 'assigned', '{"technician_id":"7e000000-0000-4000-8000-000000000001","assigned_by":"Dispatcher"}'::jsonb, now() - interval '60 days'),
    ('40d00000-0000-4000-8000-000000000005', NULL, 'assigned', '{"technician_id":"7e000000-0000-4000-8000-000000000002","assigned_by":"Dispatcher"}'::jsonb, now() - interval '46 days'),
    ('40d00000-0000-4000-8000-000000000013', NULL, 'assigned', '{"technician_id":"7e000000-0000-4000-8000-000000000004","assigned_by":"Dispatcher"}'::jsonb, now() - interval '37 days'),
    ('40d00000-0000-4000-8000-000000000017', NULL, 'assigned', '{"technician_id":"7e000000-0000-4000-8000-000000000002","assigned_by":"Dispatcher"}'::jsonb, now() - interval '23 days'),
    ('40d00000-0000-4000-8000-000000000019', NULL, 'assigned', '{"technician_id":"7e000000-0000-4000-8000-000000000001","assigned_by":"Dispatcher"}'::jsonb, now() - interval '19 days'),
    ('40d00000-0000-4000-8000-000000000024', NULL, 'assigned', '{"technician_id":"7e000000-0000-4000-8000-000000000002","assigned_by":"Dispatcher"}'::jsonb, now() - interval '12 days'),
    -- work_order: notes (field, actor = author technician)
    ('40d00000-0000-4000-8000-000000000001', '7e000000-0000-4000-8000-000000000001', 'note_added', '{"note":"Replacement belt ordered.","author":"Dana Whitfield"}'::jsonb, now() - interval '48 days'),
    ('40d00000-0000-4000-8000-000000000007', '7e000000-0000-4000-8000-000000000005', 'note_added', '{"note":"Coolant topped up; monitoring pressure.","author":"Renee Boucher"}'::jsonb, now() - interval '32 days'),
    ('40d00000-0000-4000-8000-000000000011', '7e000000-0000-4000-8000-000000000003', 'note_added', '{"note":"Door alignment shimmed, retest passed.","author":"Priya Nair"}'::jsonb, now() - interval '20 days'),
    ('40d00000-0000-4000-8000-000000000020', '7e000000-0000-4000-8000-000000000005', 'note_added', '{"note":"Diagnosed faulty contactor; part on order.","author":"Renee Boucher"}'::jsonb, now() - interval '10 days'),
    ('40d00000-0000-4000-8000-000000000018', '7e000000-0000-4000-8000-000000000002', 'note_added', '{"note":"Combustion readings within spec.","author":"Sam Ortega"}'::jsonb, now() - interval '14 days')
) AS v(entity_id, actor_id, event_type, payload, occurred_at)
WHERE NOT EXISTS (SELECT 1 FROM pgcj.events);

COMMIT;