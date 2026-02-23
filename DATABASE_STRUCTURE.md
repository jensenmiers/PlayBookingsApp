# Database Structure (Rebuilt From Code + Live Inspection)

Last rebuilt: 2026-02-23

## How this was rebuilt

This document was rebuilt without using the previous `DATABASE_STRUCTURE.md`.

Sources used:

1. Live schema existence check via `npm run inspect:schema` (confirmed tables that currently exist in Supabase).
2. SQL migrations in `supabase/migrations/`.
3. Runtime data access code (`src/repositories/**`, `src/services/**`, `src/app/api/**`, `src/hooks/**`).
4. Type contracts in `src/types/index.ts`.
5. Seed/admin scripts in `scripts/**`.

## Confidence Legend

- `Confirmed`: Observed directly in live DB inspection or explicit SQL migration.
- `Inferred`: Derived from TypeScript contracts and production query usage.
- `Pending Deployment`: Defined in migration files in this repo but not present in current live DB.

## High-Level Model

Core domain:

- `users` own `venues`.
- `venues` expose classic `availability` slots and unified `slot_templates`/`slot_instances`.
- `bookings` reserve venue time slots for renters.
- `recurring_bookings` store expanded recurrence instances.
- `payments` track Stripe payment lifecycle for bookings.
- `audit_logs` capture application-level change events.

Secondary/supporting tables:

- `insurance_documents`
- `subscriptions`
- `messages`
- `slot_templates`
- `slot_instances`
- `slot_modal_content`
- `slot_interactions`
- `pricing_rules` (pending deployment)
- `slot_instance_pricing` (pending deployment)

## Tables Present in Live DB (`Confirmed`)

From `npm run inspect:schema` + direct table existence checks on 2026-02-23:

1. `users`
2. `venues`
3. `availability`
4. `bookings`
5. `recurring_bookings`
6. `insurance_documents`
7. `payments`
8. `audit_logs`
9. `subscriptions`
10. `messages`
11. `slot_templates`
12. `slot_instances`
13. `slot_modal_content`
14. `slot_interactions`

Pending deployment in live DB (present in migrations):

1. `pricing_rules`
2. `slot_instance_pricing`

Note: table/trigger/function metadata RPC helpers (`get_table_structure`, `get_all_triggers`, `get_all_functions`) are not installed in the target DB right now, so column-level inspection had to be inferred from application code + migrations.

## Table Reference

## `users`

Status: `Confirmed` table, `Inferred` columns

Columns used by app:

- `id` (UUID, PK, aligned to Supabase auth user id)
- `email`
- `is_renter` (boolean; migration default true)
- `is_venue_owner` (boolean; migration default false)
- `is_admin` (boolean; migration default false)
- `first_name` (nullable)
- `last_name` (nullable)
- `phone` (nullable)
- `avatar_url` (nullable)
- `created_at`
- `updated_at`

Migration notes:

- `supabase/migrations/20250115214424_user_role_booleans.sql` removes legacy `role` enum column and replaces it with capability booleans.

## `venues`

Status: `Confirmed` table, mixed `Confirmed/Inferred` columns

Columns used by app:

- `id` (UUID, PK)
- `name`
- `venue_type` (text classification for listing cards; e.g. `School Gymnasium`, `Recreation Center`)
- `description`
- `address`
- `city`
- `state`
- `zip_code`
- `latitude`
- `longitude`
- `location` (PostGIS `geography(Point,4326)`; `Confirmed` via migration)
- `owner_id` (UUID FK to `users.id`)
- `hourly_rate`
- `weekend_rate` (nullable)
- `instant_booking` (boolean)
- `insurance_required` (boolean)
- `max_advance_booking_days`
- `photos` (array; app treats as `string[]`)
- `amenities` (array; app treats as `string[]`)
- `is_active` (boolean)
- `created_at`
- `updated_at`

Spatial/index notes (`Confirmed` via migration):

- `idx_venues_location_gist`
- `idx_venues_location_gist_active` (`WHERE is_active = true AND location IS NOT NULL`)

## `availability`

Status: `Confirmed` table, mixed `Confirmed/Inferred` columns

Columns used by app:

- `id` (UUID, PK)
- `venue_id` (UUID FK to `venues.id`)
- `date`
- `start_time`
- `end_time`
- `is_available` (boolean)
- `created_at`
- `updated_at`

Index note (`Confirmed` via migration):

- `idx_availability_venue_date_time` on `(venue_id, date, start_time)` where `is_available = true`

Inferred constraints:

- Seeder behavior suggests duplicate protection likely exists for slot identity (at least sometimes emits code `23505` on duplicate insert).

## `bookings`

Status: `Confirmed` table, `Inferred` columns

Columns used by app:

- `id` (UUID, PK)
- `venue_id` (UUID FK to `venues.id`)
- `renter_id` (UUID FK to `users.id`)
- `date`
- `start_time`
- `end_time`
- `status` (`pending | confirmed | cancelled | completed` in app)
- `total_amount`
- `insurance_approved` (boolean)
- `insurance_required` (boolean)
- `recurring_type` (`none | weekly | monthly` in app)
- `recurring_end_date` (nullable)
- `notes` (nullable)
- `created_at`
- `updated_at`

Behavior notes:

- Conflict checks treat only `pending` and `confirmed` as blocking.
- Default delete path is soft-cancel (`status = 'cancelled'`).

## `recurring_bookings`

Status: `Confirmed` table, `Inferred` columns

Columns used by app:

- `id` (UUID, PK)
- `parent_booking_id` (UUID FK to `bookings.id`)
- `venue_id` (UUID FK to `venues.id`)
- `renter_id` (UUID FK to `users.id`)
- `date`
- `start_time`
- `end_time`
- `status` (`pending | confirmed | cancelled | completed` in app)
- `total_amount`
- `insurance_approved` (boolean)
- `created_at`
- `updated_at`

## `payments`

Status: `Confirmed` table, `Inferred` columns

Columns used by app:

- `id` (UUID, PK)
- `booking_id` (UUID FK to `bookings.id`)
- `renter_id` (UUID FK to `users.id`)
- `venue_id` (UUID FK to `venues.id`)
- `stripe_payment_intent_id` (nullable)
- `stripe_setup_intent_id` (nullable)
- `stripe_transfer_id` (nullable)
- `amount`
- `platform_fee`
- `venue_owner_amount`
- `status` (`pending | authorized | paid | refunded | failed` in app)
- `paid_at` (nullable)
- `refunded_at` (nullable)
- `refund_amount` (nullable)
- `created_at`
- `updated_at`

## `insurance_documents`

Status: `Confirmed` table, `Inferred` columns

Columns used by app types:

- `id` (UUID, PK)
- `booking_id` (UUID FK to `bookings.id`)
- `renter_id` (UUID FK to `users.id`)
- `document_url`
- `policy_number` (nullable)
- `coverage_amount` (nullable)
- `effective_date`
- `expiration_date`
- `status` (`pending | approved | rejected | needs_changes` in app)
- `rejection_reason` (nullable)
- `reviewed_by` (nullable, likely FK to `users.id`)
- `reviewed_at` (nullable)
- `created_at`
- `updated_at`

## `audit_logs`

Status: `Confirmed` table, `Inferred` columns

Columns used by `src/services/auditService.ts`:

- `id` (UUID, PK)
- `table_name`
- `record_id`
- `action` (`create | update | delete`)
- `old_values` (nullable JSON-like payload)
- `new_values` (nullable JSON-like payload)
- `user_id` (UUID FK to `users.id`)
- `created_at`

## `subscriptions`

Status: `Confirmed` table, `Inferred` columns

Columns used by app types:

- `id` (UUID, PK)
- `user_id` (UUID FK to `users.id`)
- `stripe_subscription_id` (nullable)
- `stripe_customer_id` (nullable)
- `status`
- `current_period_start`
- `current_period_end`
- `trial_end` (nullable)
- `created_at`
- `updated_at`

## `messages`

Status: `Confirmed` table, `Inferred` columns

Columns used by app types:

- `id` (UUID, PK)
- `sender_id` (UUID FK to `users.id`)
- `recipient_id` (UUID FK to `users.id`)
- `booking_id` (nullable FK to `bookings.id`)
- `subject` (nullable)
- `content`
- `is_read` (boolean)
- `created_at`

## `slot_templates`

Status: `Confirmed` table, mixed `Confirmed/Inferred` columns

Columns defined/used:

- `id` (UUID, PK)
- `venue_id` (UUID FK to `venues.id`)
- `name`
- `action_type` (`instant_book | request_private | info_only_open_gym`)
- `day_of_week` (0-6)
- `start_time`
- `end_time`
- `slot_interval_minutes`
- `blocks_inventory` (boolean)
- `is_active` (boolean)
- `metadata` (JSONB)
- `pricing_rule_id` (UUID FK to `pricing_rules.id`, pending deployment)
- `created_at`
- `updated_at`

Notes:

- Uniqueness/validation handled by constraints in unified slot engine migration.
- `pricing_rule_id` is introduced by migration `20260223000100_add_normalized_slot_pricing.sql` and is currently pending deployment.

## `slot_instances`

Status: `Confirmed` table, mixed `Confirmed/Inferred` columns

Columns defined/used:

- `id` (UUID, PK)
- `venue_id` (UUID FK to `venues.id`)
- `template_id` (UUID FK to `slot_templates.id`, nullable)
- `date`
- `start_time`
- `end_time`
- `action_type` (`instant_book | request_private | info_only_open_gym`)
- `blocks_inventory` (boolean)
- `is_active` (boolean)
- `source_availability_id` (UUID FK to `availability.id`, nullable)
- `metadata` (JSONB)
- `created_at`
- `updated_at`

Index/constraint notes:

- Unique slot identity: `(venue_id, date, start_time, end_time, action_type)`.
- Active-date lookup index on `(venue_id, date, start_time)` where `is_active = true`.
- Action-type index on `action_type`.

## `slot_modal_content`

Status: `Confirmed` table, mixed `Confirmed/Inferred` columns

Columns defined/used:

- `id` (UUID, PK)
- `venue_id` (UUID FK to `venues.id`)
- `action_type` (`instant_book | request_private | info_only_open_gym`)
- `title`
- `body`
- `bullet_points` (`text[]`)
- `cta_label` (nullable)
- `created_at`
- `updated_at`

Constraint note:

- One row per `(venue_id, action_type)`.

## `slot_interactions`

Status: `Confirmed` table, mixed `Confirmed/Inferred` columns

Columns defined/used:

- `id` (UUID, PK)
- `slot_instance_id` (UUID FK to `slot_instances.id`, nullable)
- `venue_id` (UUID FK to `venues.id`)
- `user_id` (UUID FK to `users.id`, nullable)
- `event_type` (`slot_click | modal_open | modal_close | modal_cta`)
- `metadata` (JSONB)
- `created_at`

Index note:

- Created-at index for analytics reads and slot-instance index for per-slot drilldown.

## `pricing_rules`

Status: `Pending Deployment` (migration-defined, not present in current live DB)

Defined columns:

- `id` (UUID, PK)
- `venue_id` (UUID FK to `venues.id`)
- `action_type` (`slot_action_type`)
- `amount_cents` (integer, non-negative)
- `currency` (3-char ISO code, default `USD`)
- `unit` (`hour | person | session`)
- `payment_method` (`in_app | on_site`)
- `is_active` (boolean)
- `created_at`
- `updated_at`

Purpose:

- Normalized reusable pricing policy by venue + slot action type.

## `slot_instance_pricing`

Status: `Pending Deployment` (migration-defined, not present in current live DB)

Defined columns:

- `slot_instance_id` (UUID PK/FK to `slot_instances.id`)
- `pricing_rule_id` (UUID FK to `pricing_rules.id`, nullable)
- `amount_cents`
- `currency`
- `unit` (`hour | person | session`)
- `payment_method` (`in_app | on_site`)
- `created_at`

Purpose:

- Immutable-ish pricing snapshot at slot-instance level so UI and historical analytics stay consistent when rules change later.

## Functions, Extensions, and Indexes

## PostGIS extension

`Confirmed` via `supabase/migrations/20260121000001_enable_postgis.sql`:

- `CREATE EXTENSION IF NOT EXISTS postgis;`

## RPC: `get_venues_with_next_available`

`Confirmed` via `supabase/migrations/20260121000003_create_get_venues_with_next_available.sql`.

Purpose:

- Returns active venues with next available slot.
- Supports optional date filtering and optional user-location radius filtering.
- Computes optional `distance_miles` when lat/lng is provided.

Used by:

- `src/hooks/useVenuesWithNextAvailable.ts`
- `src/app/venues/page.tsx`

## Function: `refresh_slot_instances_from_templates`

`Confirmed` function family exists (introduced in unified slot engine migration). Current repo version also includes pricing snapshot materialization logic (`Pending Deployment` until migration is applied).

Purpose:

- Rebuild `slot_instances` for a venue/date window from `slot_templates`.
- In the latest repo migration, also upsert/delete `slot_instance_pricing` snapshots tied to generated instances.

Used by:

- Slot-engine seed/backfill migration flow for Memorial Park.

## Schema inspection helper RPCs

Defined in `supabase/schema-inspection-helpers.sql` but currently not available in production schema cache:

- `get_table_structure`
- `get_all_triggers`
- `get_all_functions`

## Access Control and RLS (Observed)

From migration + connection tests:

- Admin capability policies exist on multiple tables and are keyed off `users.is_admin`.
- Public venue reads are expected to work for unauthenticated users (`connection-test` expects this).
- Unauthenticated access to `users` is expected to be blocked.

## Relationship Map (Inferred)

- `users (1) -> (many) venues` via `venues.owner_id`
- `users (1) -> (many) bookings` via `bookings.renter_id`
- `venues (1) -> (many) availability` via `availability.venue_id`
- `venues (1) -> (many) slot_templates` via `slot_templates.venue_id`
- `slot_templates (1) -> (many) slot_instances` via `slot_instances.template_id`
- `venues (1) -> (many) slot_instances` via `slot_instances.venue_id`
- `slot_instances (1) -> (0..1) slot_instance_pricing` via `slot_instance_pricing.slot_instance_id` (`Pending Deployment`)
- `venues (1) -> (many) pricing_rules` via `pricing_rules.venue_id` (`Pending Deployment`)
- `pricing_rules (1) -> (many) slot_templates` via `slot_templates.pricing_rule_id` (`Pending Deployment`)
- `venues (1) -> (many) slot_modal_content` via `slot_modal_content.venue_id`
- `venues (1) -> (many) slot_interactions` via `slot_interactions.venue_id`
- `slot_instances (1) -> (many) slot_interactions` via `slot_interactions.slot_instance_id`
- `venues (1) -> (many) bookings` via `bookings.venue_id`
- `bookings (1) -> (many) recurring_bookings` via `recurring_bookings.parent_booking_id`
- `bookings (1) -> (many?) payments` app currently treats as logical 1:1 by `findByBookingId().single()`
- `bookings (1) -> (many) insurance_documents`
- `users (1) -> (many) payments` via `payments.renter_id`
- `users (1) -> (many) audit_logs` via `audit_logs.user_id`
- `users (1) -> (many) messages` as sender/recipient

## Operational Data Flows

## Booking creation flow

1. Validate venue + advance window (`max_advance_booking_days`).
2. Check conflicts against:
   - `bookings` (`pending`, `confirmed`)
   - `recurring_bookings` (`pending`, `confirmed`)
   - `availability` blocks
3. Insert booking in `bookings`.
4. Optionally generate `recurring_bookings`.
5. Insert `audit_logs`.

## Availability computation flow

`AvailabilityService` computes true slots by:

1. Loading regular `availability` and subtracting overlapping active `bookings` + `recurring_bookings`.
2. Loading `slot_instances` for `info_only_open_gym`.
3. Removing regular slots that overlap blocking info-only sessions.
4. Merging info-only slots with optional `slot_modal_content`.
5. Attaching `slot_instance_pricing` when present (`Pending Deployment` in current live DB).

## Slot materialization flow

1. Admin/seed defines recurring templates in `slot_templates`.
2. `refresh_slot_instances_from_templates(...)` expands templates into dated `slot_instances`.
3. In the latest repo migration, instance-level pricing is snapshotted into `slot_instance_pricing` from `pricing_rules` (`Pending Deployment` until applied).

## Payment flow

1. Create `PaymentIntent` or `SetupIntent` depending on approval model.
2. Persist/update `payments`.
3. Stripe webhook success transitions payment to `paid`.
4. Booking transitions to `confirmed` once payment succeeds.
5. Refund path transitions payment to `refunded`.

## Known Gaps / Drift Risks

1. Live DB column types/defaults/constraints cannot be fully verified until schema inspection helper RPCs are deployed (or equivalent introspection enabled).
2. `inspect:schema` currently checks a hardcoded table list and does not include newly-added slot/pricing tables; direct existence checks were used for slot/pricing status.
3. `pricing_rules` and `slot_instance_pricing` are migration-defined in repo but not yet present in the current live DB.
4. Several enum-like fields are enforced in app code; DB-level enum/check constraints are not fully confirmed by live introspection in this environment.
5. Legacy comments still mention trigger-based behavior in places, while current app logs audit events in application code.

## How to Re-Verify Quickly

1. Run `npm run inspect:schema` to confirm table existence in current environment.
2. For slot/pricing tables that are not in the inspector's hardcoded list, run direct checks (or update `src/lib/supabase/schema-inspector.ts` known table list).
3. If you need exact live columns/triggers/functions, run SQL in `supabase/schema-inspection-helpers.sql` in Supabase SQL editor, then rerun `npm run inspect:schema`.
4. Reconcile any differences between migrations and live schema before major data migrations.
