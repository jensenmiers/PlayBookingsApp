# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project-Specific Learnings

### 2026-02-04 — Availability Filtering, Auth UX, Dialog Behavior

**Context:** Building venue booking flow with real-time availability, OAuth authentication, and modal dialogs.

**Key Learnings:**

1. **Slot Splitting for True Availability**
   - Raw `availability` table records represent venue owner's available times, NOT bookable slots
   - Must filter availability against `bookings` and `recurring_bookings` tables to compute true availability
   - Use `src/utils/slotSplitting.ts` for time range subtraction (handles partial overlaps, slot splitting)
   - Pattern: Convert times to minutes-from-midnight for arithmetic, then back to HH:MM strings
   - Minimum displayable slot: 60 minutes; granularity: 30 minutes
   - API endpoint: `GET /api/venues/[id]/availability?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

2. **Proactive Auth Check Before API Calls**
   - Don't let booking API calls fail due to missing auth, then show error
   - Instead: check `useCurrentUser()` BEFORE calling API; if not authenticated, open auth modal directly
   - Pattern in `slot-booking-confirmation.tsx`: check user first → open `authModal` → return early

3. **Dialog Component Defaults (`modal={false}`)**
   - Set `modal={false}` on Dialog to allow background scrolling while dialog is open
   - Tradeoff: clicking outside no longer closes dialog (must use Cancel/X)
   - This is intentional for booking flows where users may want to reference content behind the modal

4. **OAuth PKCE Flow**
   - Supabase OAuth uses PKCE with `code_verifier` stored in cookies
   - Auth callback at `/auth/callback` exchanges code for session
   - If auth callback fails, check cookie handling and redirect URL configuration in Supabase dashboard

**Code Patterns:**
- Services: `src/services/availabilityService.ts` — server-side with Supabase client
- Utils: `src/utils/slotSplitting.ts` — pure functions for time range manipulation
- Hooks: `src/hooks/useVenues.ts` exports `useVenueAvailabilityRange` with refetch-on-focus

### 2026-02-05 — Debug Instrumentation for Auth/Session Flow

**Context:** Debugging auth/session behavior (e.g. middleware vs client session, loading states) by adding structured logs to middleware, `useCurrentUser`, and Navigation.

**Key Learnings:**

1. **Structured debug logging pattern**
   - Use a local ingest endpoint (e.g. `http://127.0.0.1:7242/ingest/<id>`) with POST + JSON body: `{ location, message, data, timestamp, sessionId, hypothesisId }`
   - Wrap blocks in `// #region agent log` / `// #endregion` so they can be found and removed (or gated) before shipping
   - Use fire-and-forget `fetch(...).catch(() => {})` so logging never throws or blocks the app

2. **Auth flow observability**
   - Instrument both middleware (`supabase.auth.getUser()`) and client hook (`useCurrentUser` + `onAuthStateChange`) plus the consuming component (e.g. Navigation render). Correlating these shows: session in middleware vs client loading vs UI state (e.g. "middleware has user but UI still loading").
   - Use consistent `hypothesisId` values (e.g. H1–H5) in logs to tie events to specific hypotheses when analyzing traces.

3. **Cleanup before commit**
   - Debug `fetch` calls to a local ingest URL and `#region agent log` blocks are temporary. Remove them or gate behind an env flag before merging so production never hits the debug endpoint or leaks PII in logs.

**Code Patterns:**
- Middleware: log after `getUser()` with `hasUser`, `path`
- useCurrentUser: log effect mount, profile fetch success, `onAuthStateChange` (event, hasSession), and null-session path
- Components: log render with `loading`, `hasUser`, `userError` to see UI state at render time

### 2026-02-02 — Embedded Stripe PaymentElement + Deslop Cleanup

**Context:** Implemented embedded Stripe PaymentElement for in-app payments (vs redirect Checkout), added inline Pay/Cancel buttons to booking list, then ran deslop to clean AI-generated code slop.

**Key Learnings:**

1. **Stripe PaymentElement vs Checkout Sessions**
   - PaymentElement: embedded UI, user stays on-site, uses PaymentIntent directly
   - Checkout Sessions: redirect to Stripe-hosted page, uses session.payment_intent
   - Both flows converge at webhook handlers (`payment_intent.succeeded`, `checkout.session.completed`)
   - `processPaymentSuccess(paymentIntentId, checkoutSessionId?)` handles both—find payment by intent ID, fallback to session metadata

2. **PaymentIntent API Pattern**
   - API route: `POST /api/payments/create-intent` → returns `{ client_secret, payment_id, amount }`
   - Client hook: `useCreatePaymentIntent()` calls API, stores `clientSecret` in state
   - Modal: `PaymentModal` wraps `Elements` provider with `clientSecret`, renders `PaymentElement`
   - On success: `stripe.confirmPayment()` with `redirect: 'if_required'` keeps user on-page

3. **Deslop Patterns — What to Remove**
   - Narration comments: `// Payment modal state`, `// Handle payment success`, `// Create PaymentIntent when modal opens`
   - Redundant JSDoc restating the obvious: `/** Inner payment form that has access to Stripe context */`
   - "Initialize outside component" comments on module-level const (self-evident from placement)
   - Verbose inline doc: `// Can pay if: status is pending or confirmed...` when code is self-documenting
   - Keep: comments that explain *why* (business rules), match existing file's comment style

4. **Inline Booking Actions UX**
   - `canPay(booking)`: pending status + insurance approved (if required)
   - `canCancel(booking)`: pending or confirmed status
   - Show venue name by joining `venues` table in `findByRenterWithVenue()` repository method

**Code Patterns:**
- `src/services/paymentService.ts` — `createPaymentIntent()` mirrors `createCheckoutSession()` structure
- `src/components/payments/payment-modal.tsx` — separate `PaymentForm` (uses hooks) from `PaymentModal` (manages Elements)
- `src/hooks/usePaymentIntent.ts` — fetch-based hook with `{ data, loading, error, createIntent, reset }`
- Webhook route: add `case 'payment_intent.succeeded':` alongside existing `checkout.session.completed`