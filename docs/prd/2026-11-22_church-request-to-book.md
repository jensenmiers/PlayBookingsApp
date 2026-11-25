# PRD: Request a time at First Presbyterian Church of Hollywood

- **Date:** 2026-11-22
- **Status:** Draft for review
- **Owner:** Jensen Miers
- **Code at time of writing:** `main` at `c81d388`
- **Related:** [Future ideas and explored concepts](../ideas/2026-11-22_future-ideas.md)

## 1. Summary

Play Bookings narrows to one venue: **First Presbyterian Church of Hollywood**. The church can't be booked instantly. Its owner asked to receive each renter's time request by email and confirm offline. So the app becomes a clean **request-to-book** flow, modelled on PeerSpace's "Request to book" page:

1. A signed-in renter picks a date and a start and end time, and says what they're planning.
2. They send the request. No payment happens in the app.
3. Jensen gets the request by email and checks with the church.
4. Jensen clicks **Confirm** or **Decline** in `/super-admin`.
5. The app emails the renter the answer, copying Jensen.

Other venues are hidden, not deleted. Their code and data stay so they can return.

**Design principle:** reuse what the repo already has. The app's existing request-to-book mode (`booking_mode = 'request_to_book'`) already saves requests as ordinary bookings, with no slot check and no payment. This project finishes that path; it doesn't build a second one.

## 2. Goals and non-goals

### Goals

- A renter can request a specific time at the church in under a minute, on a phone.
- Every request reaches Jensen by email with everything needed to ask the church.
- The renter always knows where they stand: requested, confirmed or declined.
- Every request and every answer is recorded in the database (a log), not only in email.
- The rest of the site shows only the church, without breaking pages built for several venues.
- Simpler system design: no new tables, one new column, and changes kept to the request-to-book branches that already exist.

### Non-goals (this version)

- Guest requests without an account.
- Taking payment in the app. Payment is arranged offline.
- Instant booking at the church.
- Repeating requests, such as every Tuesday in December.
- Picking from a calendar of open slots, or the "flexible days of the week" picker. Both are in the ideas doc.
- Automatically reading the church's availability from CatchCorner.
- Asking headcount. Planned for sign-up later, not on this form.
- Changing instant booking, Stripe, the webhook or the saved-card gap. All stay untouched.

## 3. Users

| Who | What they need |
|---|---|
| **Renter, signed in** | Request a time quickly. See the request in My Bookings. Get an email answer. |
| **Jensen (super-admin)** | Get each request by email, confirm or decline in one click, and keep a record. |
| **Church contact** | Hears from Jensen offline and never uses the app. |

**Signing in is required.** Renters sign in with Google or an emailed code. If they aren't signed in when they press Send, the sign-in window opens. Their filled-in form is kept and restored afterwards; this already exists as `useRequestToBookAuthResume`.

## 4. Renter flow

Reference: the PeerSpace screenshots (listing page, "Request to book" form, price details, "You won't be charged yet").

### 4.1 Venue page

- `/venue/first-presbyterian-church-of-hollywood` keeps its current design (`venue-design-editorial`), which already shows `RequestToBookPanel` for request-to-book venues.
- The main button reads **Request a time**.
- Near the button:
  - "You won't be charged. The venue confirms by email, usually within 24 hours."
  - The hourly rate, for example "$X / hr · estimate".

### 4.2 Request form

This extends the existing `src/components/venue/request-to-book-panel.tsx`. That panel already has a form, review and success step, and takes a date, start time, length and notes.

These are the fields, in order:

1. **Date.** A date picker with the limits in 4.3.
2. **Usually open hints.** A row of chips shown above the times, such as "Sat 8 am–1 pm".
   - The chips come from times Jensen enters in super-admin (see 5.3).
   - Tapping a chip fills the next matching date plus its start and end time.
   - Hints are suggestions, not limits. The renter can still request any allowed time.
   - With no hints set, the row is hidden.
3. **Start time** and **end time.** They replace today's "start time + length" fields.
   - Today's server rule only accepts whole hours: at least 1 hour, in 1-hour steps (`REQUEST_TO_BOOK_MIN_DURATION_HOURS` and `REQUEST_TO_BOOK_INCREMENT_HOURS` in `bookingService.ts`).
   - The end-time list follows that rule, so it offers only whole hours after the start.
4. **What are you planning?** One choice from:
   - Pickup run
   - Team practice
   - Private training
   - Event or party
   - Other, which shows a short text box
5. **Message to host.** Free text with placeholder "Introduce yourself and tell us what you're planning." Optional. This is the existing `notes` field.
6. **Phone number.**
   - Filled from the renter's profile (`users.phone`) when it's already saved.
   - If it's missing, the renter must enter it, and it's saved to their profile.
   - The phone isn't stored on each request.
7. **Price estimate,** shown once date and times are valid:
   - "$X × N hours = $Y"
   - Underneath: "Estimate only. The venue confirms the final price. No payment now."
   - It's the booking's existing `total_amount`: the church's `venues.hourly_rate` times the hours.
8. **Send request** button.

### 4.3 Form limits

All of these are **already enforced on the server** in `BookingService.createBooking`. The form should simply show them before the renter sends.

- **No past times.** The existing check rejects a requested time that isn't in the future.
- **No same-day requests.** Set the church's minimum notice to at least 1 day. Minimum notice already uses `min_advance_booking_days` and `min_advance_lead_time_hours` from `venue_admin_configs`, through `getBookingPolicyViolation` and `getMinimumAdvanceDate`.
- **Time-of-day window.** When `operating_hours` is set in `venue_admin_configs`, requests outside it are rejected. That check exists today. Set the church's hours there.
- **Whole-hour lengths.** At least 1 hour (existing rule).
- **No repeating requests** (existing rule).
- **Messages:** the form shows plain wording such as "Pick an end time after 8:00 am", not the raw server errors.

### 4.4 After sending

The panel's existing success step becomes a fuller **Request received** screen:

- Title: "Request sent. You're not booked yet."
- The request summary: date, time, plan, estimate.
- "We'll email you within 24 hours once the venue confirms."
- A link to My Bookings, where the request shows as "Requested". `ticket-utils.ts` already treats a pending request-to-book booking as awaiting a reply.

The renter also gets an email receipt (see section 6).

## 5. Admin flow (`/super-admin`)

### 5.1 Requests list

- The super-admin venue page already lists a venue's bookings with renter details, through `GET /api/admin/venues/[id]/bookings` and `useAdminVenueBookings`.
- For the church, that list also shows the planned activity and the message.
- Pending rows are labelled **Requested**.

### 5.2 Confirm or decline

- Each pending row gets **Confirm** and **Decline** buttons. They're new admin routes beside the existing `insurance-approve` route, and follow its pattern: super-admin check, admin database client, audit log.
- **Confirm:**
  - status `pending` → `confirmed`
  - the renter gets the confirmation email, with both admin addresses on CC
- **Decline:**
  - an optional short reason
  - status `pending` → `cancelled`
  - the reason is stored in the audit log and included in the email
  - the renter gets the decline email, with both admin addresses on CC
  - My Bookings shows "Cancelled" with "Declined by the venue or cancelled. Check your email for details.", because a request the renter cancelled themselves has the same status
- Each status change is written to `audit_logs`: who, when, old status and new status.
- The confirmation email reuses the existing tracking columns, `confirmation_email_sent_at` and `confirmation_email_resend_id`.
- A request that's already confirmed or cancelled can't be changed again by mistake: its buttons are hidden, and the server checks the status too.

**Why new admin routes rather than the existing `POST /api/bookings/[id]/confirm`:** that route is built for payments. For an unpaid booking it only writes an audit log and returns `requiresPayment: true`, without confirming anything. Changing it risks the dormant payment venues. The new routes leave it alone.

### 5.3 "Usually open" hints

- A small editor on the church's settings: day of the week plus start and end time. Several rows are allowed.
- Example to start with: Saturday 8:00 am–1:00 pm (Jensen's best guess, to be confirmed).
- These only drive the chips on the form. They don't block anything and don't create slots.
- **Storage:** one new jsonb column on `venue_admin_configs`, the existing per-venue settings row that already holds `operating_hours` in the same shape.

## 6. Emails

All emails are sent through the existing Resend setup. They copy the idempotent sending pattern in `bookingConfirmationEmailService.ts`, which looks up the renter's email from `users`. The existing `BOOKING_EMAIL_OVERRIDE_TO` keeps test emails away from real people outside production.

| When | To | CC | Content |
|---|---|---|---|
| Request sent | jensen@playbookings.com, jensenmiers@gmail.com | none | "Action needed" notice. Subject: "ACTION NEEDED: new court request from {name}, {Sat, Nov 28}, {start}–{end} PT". Body sections: what they're asking for (date with weekday, time and hours, plan, message, estimate), who's asking (name, email, phone), what to do next (check with the venue, Confirm or Decline in Super Admin). Reply-To is jensen@playbookings.com, like every other email. |
| Request sent | Renter | both admin addresses | Receipt: summary, "not booked yet", reply within 24 hours. |
| Confirmed | Renter | both admin addresses | "You're confirmed": summary, venue address, how payment works offline, contact. |
| Declined | Renter | both admin addresses | "This time isn't available": optional reason, link to request another time. |

**Failure rule.** If an email fails, the request is still saved and the admin action still succeeds. The failure is logged and shown on the admin row as "email not sent".

**Admin addresses.** These reuse the existing `BOOKING_EMAIL_BCC` setting, which defaults to both admin addresses, so no new environment variable is needed. Confirmation and decline emails reach the admins as BCC, not CC, so the renter never sees the admin addresses.

## 7. Data

### Decision: reuse `bookings`, no new table

I looked at the repo before deciding. Request-to-book already runs through `bookings`:

- `BookingService.createBooking` saves a `pending` booking with the date, times, `notes` and an estimated `total_amount`.
- For request-to-book it skips the slot check (`checkConflicts` returns no conflict) and payment (`requiresPayment: false`).
- It already validates request rules: future time, whole hours, operating hours, minimum notice, no repeats.
- My Bookings, the admin bookings list, the audit log and the confirmation email all already read `bookings`.

A separate `booking_requests` table was only needed for guests, because `bookings.renter_id` must point at a user. With sign-in required, it would duplicate all of the above.

### Changes

| Change | Why |
|---|---|
| `bookings.activity` (new nullable text column) | Holds "What are you planning?": the chosen label, or the typed text for Other. Nullable, so existing bookings are unaffected. |
| `venue_admin_configs` gets a new jsonb column for "usually open" hints | Hint chips (5.3). Same shape as `operating_hours`. |
| No change to `users` | Phone already lives in `users.phone`. |
| Data-only updates | Set other venues inactive, set the church to `request_to_book`, and set its operating hours and minimum notice. |

### No request limit

Signed-in renters can send as many requests as they like. Sign-in is the protection against spam, so there's no per-day cap, honeypot or CAPTCHA.

## 8. Site changes

- **Hide other venues.** Set `is_active = false` on every venue except the church. Their rows, photos, slots and settings stay. `/api/venues` already filters on `is_active`.
- **Church's booking mode.** Make sure it is `booking_mode = 'request_to_book'`.
- **Homepage.**
  - The featured row keeps its 3-column layout: the church card plus two muted "More LA courts coming soon" placeholder cards.
  - Today the row picks three venues by name (`FEATURED_COURT_LIMIT = 3`, `DEMO_FEATURED_VENUE_NAMES` in `src/app/page.tsx`). That logic stays, and placeholders fill the empty spots, so adding venues back is just turning them on.
  - The hero's main button points to the church page.
- **`/search` and `/venues`.** They stay up and show only the church, because only active venues load.
  - Check for empty states that read badly with one result.
  - Check the map's zoom on a single pin.
- **SEO landing pages.** They stay, listing just the church. Review copy that promises "real-time availability" or "book in minutes" so it doesn't over-promise for a request-only venue.

## 9. Measuring it

Use PostHog events. One already exists: `booking_request_submitted`.

- `request_form_opened`
- `request_hint_tapped`
- `booking_request_submitted`, with properties for activity and hours
- `booking_request_confirmed`
- `booking_request_declined`

Things to watch: requests per week, form opens that turn into requests, and the share of requests confirmed.

## 10. Cleanup in this project

The rule: **document first, delete little.** Keep code and system design simple; don't build new parallel paths where an existing one works.

**Delete,** after a fresh search shows nothing uses them and after noting each in the ideas doc:
- `src/components/search/`: `venues-view.tsx`, `calendar-view.tsx`, `availability-view.tsx`, `availability-card.tsx`
- `src/components/dashboard/`: `stats-card.tsx`, `activity-item.tsx`, `booking-list-item.tsx`, `message-card.tsx`, `charts/performance-chart.tsx`, `charts/mini-line-chart.tsx`
- `src/components/bookings/`: `booking-details.tsx`, `booking-status-badge.tsx`, `booking-confirmation-dialog.tsx`
- `src/components/providers/stripe-provider.tsx`
- these unused hooks:
  - from `useBookings.ts`: `useUpdateBooking`, `useGenerateRecurring`
  - from `useVenues.ts`: `useVenueBySlug`, `useVenueAvailability`, `useAvailabilitySlots`

**Keep:**
- every venue page design (`venue-design-*`, `venue-detail-page.tsx` and their helpers)
- the Stripe Checkout path and `usePaymentCheckout`
- the redirect stub pages
- all tables and SQL
- the `ui/` primitives
- instant booking, open gym and Google Calendar sync. They're dormant for the church, but they serve the hidden venues.

## 11. Rollout

1. Build the request-form changes, the `activity` column, the hint column, the emails and the two admin routes, with tests first (TDD, per `AGENTS.md`).
2. Test end to end on a preview deploy, with emails rerouted by `BOOKING_EMAIL_OVERRIDE_TO`.
3. Flip the data in one step: set other venues inactive, set the church to `request_to_book`, and set its hours and notice.
4. Watch the first week of requests and emails.

**Rollback:** set the venues active again. No code needs reverting, and both new columns are nullable.

## 12. Acceptance criteria

- [ ] A signed-out renter who presses Send is asked to sign in, and the form comes back filled in.
- [ ] A signed-in renter can send a request with date, start, end, activity and optional message. It appears in My Bookings as "Requested".
- [ ] A renter with no saved phone must enter one, and it's saved to their profile.
- [ ] Past times, same-day dates, times outside operating hours, and non-whole-hour lengths are rejected in the form and on the server.
- [ ] Tapping a "usually open" chip fills date, start and end.
- [ ] Both admin addresses get the request email, with Reply-To set to the renter.
- [ ] The renter gets a receipt email.
- [ ] Confirm and Decline in super-admin change the status, email the renter with both admin addresses on CC, and write to `audit_logs`. They're refused for bookings that aren't pending.
- [ ] A failed email never loses a request or blocks an admin action, and shows on the row.
- [ ] The homepage shows the church card plus two "coming soon" cards; `/search` and `/venues` show only the church.
- [ ] Instant booking, payments and the Stripe webhook behave exactly as before for venues that are switched back on.

## 13. Open questions

1. What exact operating hours and minimum notice should the church have? Defaults to confirm: 7 am–10 pm, and 1 day's notice.
2. Keep whole-hour lengths (today's rule), or allow half hours, as PeerSpace does?
3. Should a renter be able to withdraw a request themselves before it's answered? The existing renter cancel route could cover this.
4. What does the confirmation email say about offline payment: amount, method and who collects?
5. Is showing a declined request as "Not available" (status `cancelled`) enough? Or should `declined` become its own status, which would touch the status type and every place it's read?
