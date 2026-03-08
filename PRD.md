# Immediate Renter Availability Sync

## Summary

This PRD defines a product change to make venue availability feel immediate and trustworthy for venue admins. After an admin saves venue schedule or policy changes, PlayBookings should update renter-facing availability for the next 30 days before showing success. Long-horizon slot generation remains asynchronous, but it becomes background maintenance rather than part of the venue admin's mental model. If Google Calendar is connected and a calendar is selected, PlayBookings should also apply one immediate blocking sync before confirming that renter availability is current.

## Problem And Current State

Today, venue admins can save schedule-related changes and see the save complete even though renter-facing availability may still be partially stale.

Current behavior:

- Canonical schedule inputs live in venue configuration and slot templates.
- Saving admin changes triggers an inline slot refresh for the near term.
- The app also enqueues longer-horizon template sync jobs for future coverage.
- Google Calendar sync is a separate path that writes external availability blocks on top of generated slots.

This creates a confusing operator experience:

- The admin experience implies the save is complete.
- The actual renter-facing availability may still depend on queued work.
- Google Calendar blocking is conceptually separate from slot generation, but the current UX does not make that distinction clear.
- Internal status language such as "slot sync pending" describes system mechanics rather than what the admin actually needs to know.

The result is low confidence in whether renters are seeing the correct availability immediately after changes are made.

## Goals

- Make the admin-facing promise simple: after Save completes successfully, renter-facing availability for the next 30 days is up to date.
- Reduce venue admin confusion around whether availability is ready for renters.
- Apply Google Calendar busy-time blocking immediately when relevant so near-term renter availability is accurate at Save completion.
- Preserve asynchronous long-horizon backfill for performance and coverage.
- Replace internal sync phrasing in the super-admin venue config surface with outcome-based status language.

## Non-Goals

- Fully synchronous regeneration for the full booking horizon.
- Replacing the template/queue architecture.
- Expanding status copy changes across the entire product in v1.
- Making Google Calendar a source-of-truth scheduler.
- Changing renter-facing copy or flows in v1.

## Users And User Stories

Primary user:

- Super-admin managing venue availability on behalf of operators.

User stories:

- As a super-admin, when I save regular booking schedule changes, I want renter-visible availability to be updated before I am told the save is complete.
- As a super-admin, when I save drop-in schedule or policy changes, I want renter-visible near-term inventory to reflect those changes immediately.
- As a super-admin, when a venue uses Google Calendar, I want the selected calendar's busy times applied immediately so renters do not see slots that should be blocked.
- As a super-admin, if future-month availability is still being processed in the background, I want that communicated without implying renters are blocked from booking correctly right now.
- As a super-admin, if immediate publish fails after Save, I want the system to preserve my config changes and clearly tell me that renter availability needs attention.

## Product Promise

After Save completes successfully, renter-facing availability for the next 30 days is current.

In this context, "current" means:

- near-term `slot_instances` reflect the saved canonical venue configuration and templates
- and, when a Google Calendar integration is active with a selected calendar, Google busy-time blocking has also been applied

## Proposed Experience

### Save Flow

When an admin saves venue config or template changes that affect availability:

1. Persist the canonical changes.
2. Regenerate all renter-relevant slots for the next 30 days immediately.
3. If Google Calendar is connected and a calendar is selected, run one immediate Google block sync.
4. Keep the UI blocked until the immediate near-term publish work completes.
5. Show a success message only after near-term renter-facing availability is updated.

### Save-Time Messaging

During save:

- `Updating renter availability...`

On successful near-term publish:

- `Renter availability is up to date.`

If future-horizon backfill is still queued or running:

- communicate that future availability is still being prepared in the background without warning-style language

If immediate publish partially fails after config persistence:

- keep the saved config
- show `Needs attention`
- explain that renter availability may not fully reflect the latest changes yet

### Status Language

Replace the current slot-sync language in the super-admin venue config surface with:

- `Ready for renters`
- `Updating future availability`
- `Needs attention`

These labels should describe the renter-facing outcome, not internal queue mechanics.

## Functional Requirements

### Immediate Near-Term Publish

- Save must trigger synchronous availability publication for the next 30 calendar days.
- The immediate path must cover all renter-relevant slot generation needed for near-term booking correctness.
- Success must not be shown until this near-term publish work is complete.

### Immediate Google Blocking

- If the venue has an active Google Calendar integration and a selected calendar, Save must also perform one immediate Google Calendar blocking sync before success is shown.
- Google Calendar remains a blocking overlay only; it does not generate slots.
- If no calendar is connected or selected, Save skips this step and can still complete successfully.

### Async Long-Horizon Backfill

- Existing long-horizon backfill remains asynchronous.
- The queue-backed process should continue extending future coverage out to 180 days.
- This async work should be treated as maintenance, not as a prerequisite for near-term trust.

### Failure Handling

- Canonical config changes are not rolled back when immediate Google sync fails.
- If immediate slot publication or immediate Google blocking fails after persistence, the venue enters `Needs attention`.
- The UI must communicate that renter availability may not fully reflect the latest saved intent.

## State Model

For the super-admin venue config experience, the status model is:

### Ready For Renters

Shown when:

- near-term slot generation succeeded
- and, if applicable, immediate Google block sync succeeded
- and there are no current publish errors requiring intervention

Meaning:

- renters can trust the next 30 days of availability

### Updating Future Availability

Shown when:

- near-term renter availability is already ready
- but long-horizon backfill is still queued or running

Meaning:

- near-term booking is safe
- future-month availability is still being prepared quietly in the background

### Needs Attention

Shown when:

- config saved, but immediate publish failed
- or config saved, but immediate Google block sync failed
- or another current availability publish issue means renter-facing results may be incomplete

Meaning:

- latest admin intent may not be fully reflected for renters yet

### Status Precedence

Precedence order:

1. `Needs attention`
2. `Updating future availability`
3. `Ready for renters`

## Google Calendar Role

Google Calendar must be described consistently throughout the product:

- PlayBookings does not create availability slots from Google Calendar.
- PlayBookings generates slots from venue configuration and templates.
- Google Calendar only contributes busy-time blocks that remove overlapping bookable windows.
- Immediate Google sync at Save time is required only to make near-term renter-facing availability accurate before success is shown.

## Interfaces And Product Surface Changes

### Super-Admin Venue Config Surface

- Replace internal slot-sync status copy with the new renter-oriented labels.
- Make Save a blocking flow until immediate near-term availability publication is complete.
- Use the new save-time and completion messages defined in this PRD.

### Google Calendar Panel

- Keep integration-specific details such as selected calendar, last sync, next sync, and sync errors.
- Do not require admins to understand queue state in order to know whether renters can book correctly right now.

## Acceptance Criteria

- Saving regular booking templates updates renter-visible near-term availability before success is shown.
- Saving drop-in schedule or drop-in policy changes updates renter-visible near-term availability before success is shown.
- Saving with a connected Google Calendar and selected calendar applies busy-time blocking before success is shown.
- Saving with Google Calendar disconnected or unselected skips immediate Google sync and can still result in `Ready for renters`.
- Saving succeeds but immediate Google sync fails results in persisted config plus `Needs attention`.
- When long-horizon backfill remains queued after a successful near-term publish, the UI shows `Updating future availability`, not a warning-style failure state.
- Once long-horizon backfill completes and there are no current publish errors, the UI shows `Ready for renters`.

## Metrics And Rollout Notes

Success metrics:

- reduced confusion from venue admins about whether renters are seeing current availability
- reduced need to manually retry sync actions after ordinary schedule edits
- reduced support/debugging around stale near-term renter availability

Rollout notes:

- v1 scope is limited to the super-admin venue config experience
- renter-facing behavior should improve because availability becomes fresher immediately after Save, but no renter-facing copy changes are required
- long-horizon async backfill remains in place for operational safety and future coverage

## Assumptions And Defaults

- This PRD applies to the super-admin venue config experience only in v1.
- Near-term means exactly 30 calendar days.
- Immediate Google sync is attempted only when a venue has an active Google integration and a selected calendar.
- Config persistence is not rolled back when immediate Google sync fails.
- The async queue remains responsible for extending slot coverage out to 180 days.
