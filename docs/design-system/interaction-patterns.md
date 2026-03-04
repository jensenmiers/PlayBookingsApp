# Interaction Patterns

This is the interaction contract for scoped search and booking surfaces.

## Surface-Level Patterns

- Use existing shared wrappers for form field composition, validation messages, and control labels.
- Prefer existing `src/components/ui/**` primitives before adding new interaction primitives.
- Keep interaction states explicit: loading, empty, success, and error should each have a visible state.

## Booking/Search Flows

- Search and booking routes should preserve current mobile-first behavior.
- Filters and controls should use tokenized spacing/color classes only.
- New or changed form interactions in scoped surfaces must use `@/components/ui/form` wrappers.

## Consistency Rules

- Do not introduce direct `@radix-ui/*` usage in feature components.
- Avoid one-off visual exceptions unless guarded by a documented lint exception marker with reason.
