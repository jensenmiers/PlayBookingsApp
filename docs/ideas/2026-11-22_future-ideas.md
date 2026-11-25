# Future ideas and explored concepts

- **Date:** 2026-11-22
- **Code at time of writing:** `main` at `c81d388`
- **Related:** [PRD: Request a time at the church](../prd/2026-11-22_church-request-to-book.md)

This is a record of features that were built, half-built or explored but aren't part of the one-venue (church) version. Each entry says what the idea is, where the code lives today, and what it would take to bring it back. Where code is deleted in the church project, this doc is its memory.

## Venue pages and design

- **Alternative venue page designs.** Four layouts were built besides the one in use (`venue-design-editorial`):
  - Arena, Community, Quickplay and Scoreboard: `src/components/venue/venue-design-*.tsx`
  - an older layout, `venue-detail-page.tsx`, with `availability-slots-list.tsx`

  None of them render today. **Kept on purpose** for future design work. To try one again, switch the venue page to render it.
- **Brand colour concepts.** `/brand-concepts/[concept]` previews alternative brand palettes. It's an internal page.

## Finding and choosing a time

- **Pick from open slots.** The slot engine (`slot_templates` → `slot_instances`) and the venue calendar show exact bookable windows. Venues on instant booking use it; the church version uses free-form times instead.
- **Flexible picker.** Like PeerSpace's "Flexible" tab: choose days of the week, a month and a time, then see places open then. Good for "any Tuesday evening in December".
- **Repeating requests.** Ask for a repeating time, such as every Tuesday in December from 6–8 pm, in one request. A `recurring_bookings` table and `/api/bookings/recurring` already exist, but no screen calls them.
- **Bring the three time pickers together.** Exact date and time, open slots, and flexible could become tabs on one form, like PeerSpace's Dates / Flexible toggle. The open question is how to keep that simple.
- **Automatic church availability from CatchCorner.** A separate service, outside this app, would read the church's public CatchCorner page each week and update the "usually open" times in our database:
  - the page: https://www.catchcorner.com/facility-page/first-presbyterian-church-of-hollywood/home
  - the church doesn't share a schedule with us, and its CatchCorner page shows the current week
  - check CatchCorner's terms before reading the page automatically
- **Search page views.** Older search layouts (`src/components/search/venues-view.tsx`, `calendar-view.tsx`, `availability-view.tsx`, `availability-card.tsx`) offered list, calendar and availability-first views. `SplitAvailabilityView` (map plus list) replaced them. *Deleted on the `feat/church-request-to-book` branch; recover them from `main` at `c6f9ade` or earlier. Their tests and the `useAvailabilitySlots` hook were deleted with them.*

## Booking and payments

- **Instant booking with payment.** The full flow works for active instant-booking venues: slot, then PaymentIntent, then Stripe webhook, then confirmed, then email. It's dormant while only the church is live. Kept untouched.
- **Approval with a saved card ("charge after approval").** A known gap, half-built and not working:
  - **What exists:** the card is saved with a SetupIntent and the payment is marked `authorized`.
  - **Approval never charges it.** `/api/payments/capture` and `PaymentService.capturePayment` have no caller.
  - **The charge would probably fail anyway.** No Stripe Customer is created, so the saved card likely can't be charged later.
  - **"Authorized" is set too early,** before the renter even submits a card.
  - **Renters can skip approval.** The "Pay" button in My Bookings shows for these bookings and charges them straight away.

  Two fixes were weighed:
  - **Pay after approval:** no card at request time; the renter pays once approved. Smaller.
  - **Charge on approval:** create a Stripe Customer, attach the card, charge when the admin clicks Confirm.
- **Stripe Checkout (hosted payment page).** This was the first payment method: `/api/payments/checkout`, `usePaymentCheckout`, `/booking/cancelled`. The embedded card form replaced it. Kept, unused.
- **Editing a booking.** `PATCH /api/bookings/[id]` and the `useUpdateBooking` hook exist with no screen. *The hook was deleted (recover from `main` at `c6f9ade`); the route stays. `useGenerateRecurring` was deleted too.*
- **Platform fee and payouts to owners.** `payments.platform_fee` is always 0 and `stripe_transfer_id` is never written. Stripe Connect payouts were planned (the README mentions them) but not built.
- **Booking details dialogs.** `booking-details.tsx`, `booking-status-badge.tsx` and `booking-confirmation-dialog.tsx` were earlier ways of showing a booking. The ticket view replaced them. *Deleted on the `feat/church-request-to-book` branch; recover them from `main` at `c6f9ade` or earlier.*

## Hosts and owners

- **Host self sign-up.** `/become-a-host` and `/auth/upgrade-to-host` exist. The flag `HOST_ONBOARDING_ENABLED` in `src/lib/hostOnboarding.ts` is hard-coded to `false`, so the upgrade screen can't be reached.
- **Owner dashboard.** `/dashboard`, `/listings`, `/payouts`, `/messages` and `/settings` were planned owner pages. Today each just redirects to `/my-bookings`, but `sidebar-navigation.tsx` still links to them.
  - Dashboard widgets were also built: stat cards, an activity feed, message cards and small charts.
  - *Those widgets (`src/components/dashboard/stats-card.tsx`, `activity-item.tsx`, `booking-list-item.tsx`, `message-card.tsx`, and `src/components/charts/`) were deleted on the `feat/church-request-to-book` branch; recover them from `main` at `c6f9ade`. The redirect pages stay.*
- **Messages between renter and owner.** There's a `messages` table, but nothing reads it.
- **Insurance documents.** There's an `insurance_documents` table, but approval is just a yes/no flag set by the super-admin. A real flow would upload and review the certificate.
- **Subscriptions.** There's a `subscriptions` table with no code. Possibly for owner plans or renter memberships.

## Open gym

- **Drop-in open gym sessions.** Venues can show open gym times (`info_only_open_gym` slots, with a drop-in price) as information only; they can't be booked in the app. Dormant for the church.

## Calendars

- **Google Calendar sync.** An admin can connect a venue's Google Calendar, and busy events remove slots. It runs only when the admin saves, presses sync, or runs the manual script. Nothing schedules it. Dormant for the church.

## Sign-up and profile

- **Sign in with a text code (phone OTP).** The renter types a phone number and gets a one-time code by text. Supabase Auth supports this as a normal sign-in method. It creates a real account, so bookings keep working with no guest columns. It would also verify the phone number we already ask for.
  - **What it takes:**
    - an SMS provider connected in the Supabase dashboard, such as Twilio (Twilio Verify is one of the options)
    - a cost per text sent
    - for US numbers, possibly registering the sender with carriers ("A2P 10DLC"), which can take days to weeks. Whether Twilio Verify avoids that needs checking.
    - protection against "SMS pumping" fraud, where bots trigger texts to premium numbers, through rate limits and a CAPTCHA on the send-code step
  - **Why not now:** Google and emailed-code sign-in already work. With one request-only venue confirmed by hand, a verified phone adds little, and the setup is slow.
  - **Worth revisiting** when there's instant booking at scale, or when no-shows from fake numbers become a real problem.

- **Guest requests without an account.** The church version requires sign-in, because every booking must belong to a user (`bookings.renter_id`). Supporting guests later means one of these:
  - make `renter_id` nullable and add guest name, email and phone columns to `bookings`. About 8 source files assume every booking has an account and would need guarding: emails, the admin list, permission checks and payments.
  - a separate requests table.
  - create a lightweight account for the guest behind the scenes. Supabase's handling of a later sign-in with the same email needs testing before relying on this.

- **Headcount and group details at sign-up.** Eventually ask renters things like "how many people usually play with you?" when they sign up, rather than on every request. Left out of the church version on purpose.

## Unused tables (kept)

| Table | What it was for |
|---|---|
| `availability` | The original availability model before the slot engine. Kept for rollback. |
| `insurance_documents` | Insurance certificate uploads. |
| `messages` | Renter and owner messaging. |
| `subscriptions` | Unknown or future plans. |
| `pricing_rules` | Open gym pricing rules. May be read inside SQL functions. |

## Unclear status

These can't be settled by reading the repo:

- The old `/auth/callback` route without a nonce may still be listed in Supabase's allowed redirects.
- `check_booking_conflicts()` may or may not still be attached as a database trigger in production.

## Deleted in the church project

All of these had no callers. Recover any of them from `main` at `c6f9ade` or earlier.

- **Search views:** `venues-view.tsx`, `calendar-view.tsx`, `availability-view.tsx` and `availability-card.tsx`, with their two tests.
- **Dashboard widgets:** `stats-card.tsx`, `activity-item.tsx`, `booking-list-item.tsx` and `message-card.tsx`, plus `src/components/charts/` (`mini-line-chart.tsx`, `performance-chart.tsx`).
- **Booking dialogs:** `booking-details.tsx`, `booking-status-badge.tsx` and `booking-confirmation-dialog.tsx`.
- **Stripe provider:** `src/components/providers/stripe-provider.tsx`. The payment modal loads Stripe on its own.
- **Hooks:** `useUpdateBooking` and `useGenerateRecurring` (from `useBookings.ts`), and `useVenueBySlug`, `useVenueAvailability` and `useAvailabilitySlots` (from `useVenues.ts`).
