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