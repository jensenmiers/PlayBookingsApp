# Database Structure

This file is a high-level map of the production data model used by Play Bookings.
It is intentionally not a column-by-column reference.

## Known Gaps

- Last verified: 2026-02-27 (America/Los_Angeles)
- Verification sources:
  - Live table existence checks with service-role Supabase queries
  - SQL migrations in `supabase/migrations`
  - Runtime usage in `src/services`, `src/app/api`, and `src/types`
- Gap: column-level, trigger, and function introspection is limited because helper RPCs (`get_table_structure`, `get_all_triggers`, `get_all_functions`) are not installed in the current Supabase project.
- Gap: this document describes architecture and ownership boundaries, not every constraint/index/default.

## Automated Snapshot (Generated)

<!-- AUTO-SNAPSHOT:DB:START -->
- Generated at: 2026-02-27 (America/Los_Angeles)
- Latest migration in repo: `20260228000200_remove_redundant_insurance_columns_from_venue_admin_configs.sql` (27 total)
- Distinct tables referenced in app code via `.from()`: 13
- App table sample: `audit_logs`, `availability`, `bookings`, `payments`, `recurring_bookings`, `regular_template_sync_queue`, `slot_instances`, `slot_interactions`, `slot_modal_content`, `slot_templates`, `users`, `venue_admin_configs` (+1 more)
- Live key-table check: 19/19 tables available
<!-- AUTO-SNAPSHOT:DB:END -->

## Current Model (By Domain)

### Identity and Access

- `users`: application profile and capability flags (`is_renter`, `is_venue_owner`, `is_admin`).
- RLS is used broadly; admin write paths are explicitly policy-gated.

### Core Marketplace

- `venues`: rentable facility records (location, pricing, listing metadata, booking mode flags).
- `availability`: legacy regular-slot source used in `legacy` schedule mode.
- `bookings`: primary booking records.
- `recurring_bookings`: expanded recurring instances linked to a parent booking.

### Slot Engine (Template-Based Scheduling)

- `slot_templates`: reusable weekly slot definitions by action type.
- `slot_instances`: materialized date-specific slots generated from templates.
- `slot_modal_content`: venue/action-specific content for informational slot UX.
- `slot_interactions`: analytics/event log for slot and modal interactions.

### Slot Pricing

- `pricing_rules`: reusable per-venue/per-action pricing definitions.
- `slot_instance_pricing`: per-instance pricing snapshots written during slot materialization.

### Venue Policy and Operations

- `venue_admin_configs`: per-venue policy source of truth (drop-in config, minimum advance policy, operating windows, blackout/holiday dates, insurance requirements, review cadence, and policy text).
- `drop_in_template_sync_queue`: async queue for regenerating drop-in-driven slot instances.
- `regular_template_sync_queue`: async queue for regenerating regular template-driven slot instances.

### Payments, Compliance, and Supporting Data

- `payments`: booking payment lifecycle (including deferred authorization/setup-intent flows).
- `insurance_documents`: booking-linked insurance verification artifacts.
- `subscriptions`: user subscription billing metadata.
- `messages`: user-to-user communication records.
- `audit_logs`: append-only admin/service change history.

## Latest Schema Decisions (What Changed Recently)

1. Policy control moved to `venue_admin_configs`:
   - Minimum advance controls are now `min_advance_booking_days` + `min_advance_lead_time_hours`.
   - Same-day cutoff was removed.
   - Policy evaluation is anchored to `America/Los_Angeles`.
2. Regular schedule source is now configurable:
   - `regular_schedule_mode = 'legacy'` uses `availability`.
   - `regular_schedule_mode = 'template'` uses `slot_templates` -> `slot_instances`.
3. Slot generation is async and queue-backed:
   - Admin edits enqueue regeneration (`enqueue_drop_in_template_sync`, `enqueue_regular_template_sync`).
   - Worker scripts process queues and refresh materialized slot instances.
4. Slot pricing is normalized and snapshotted:
   - Templates can reference `pricing_rules`.
   - Generated instances receive `slot_instance_pricing` snapshots for runtime reads.
5. `venues.max_advance_booking_days` remains present for legacy compatibility, but policy enforcement now prioritizes admin config minimum-advance controls.
6. Insurance policy controls were simplified:
   - `venues.insurance_required` is now the only venue-level insurance gate.
   - `venue_admin_configs.insurance_requires_manual_approval` and `venue_admin_configs.insurance_document_types` were removed.

## Operational Notes

- `slot_instances` is generated output, not canonical authoring input.
- Canonical schedule intent lives in:
  - `availability` (legacy mode), and/or
  - `slot_templates` + `venue_admin_configs` (template mode).
- Queue processing currently depends on scripts:
  - `scripts/process-drop-in-template-sync-queue.ts`
  - `scripts/process-regular-template-sync-queue.ts`

## When To Update This File

Update this document only when one of these changes:

- A new table/domain is introduced or retired.
- Source-of-truth ownership shifts between tables.
- A policy model changes (for example, booking eligibility rules).
- A core async data flow changes (enqueue/process/materialize pattern).
