# Implementation Checklist: Availability-Based Booking

## Quick Reference Summary

**Goal**: Replace free-form time inputs with dropdown selects that only show available time slots from the database.

**Current State**: 
- Form has `<Input type="time">` for start_time and end_time
- Availability hook exists (`useVenueAvailability`) - fetches directly from Supabase
- Backend already validates availability during booking creation

**Changes Needed**: 
- Replace time inputs with select dropdowns
- Populate dropdowns from availability data
- Filter end times based on selected start time

---

## ✅ Implementation Checklist

### Step 1: Create Time Slot Utility Functions
- [ ] Create `src/utils/availabilityHelpers.ts`
- [ ] Implement `generateTimeSlotOptions(availabilityBlocks)` 
  - Converts availability blocks to selectable time options
  - Returns `{ value: string, label: string }[]` 
  - Format: value = "HH:MM:SS", label = "HH:MM" (or "9:00 AM")
- [ ] Implement `getAvailableEndTimes(availabilityBlocks, startTime)`
  - Filters end time options based on selected start time
  - Ensures end time is within availability block
  - Returns array of valid end time options

**Questions to Answer**:
- [ ] What time granularity? (hourly, 30-min, 15-min) → **DECISION NEEDED**
- [ ] 12-hour or 24-hour display format? → **DECISION NEEDED**

---

### Step 2: Update Booking Form Component
**File**: `src/components/forms/create-booking-form.tsx`

- [ ] Import `useVenueAvailability` hook (already exists in `useVenues.ts`)
- [ ] Import availability helper functions
- [ ] Add hook call: `useVenueAvailability(watchedVenueId, watchedDate)`
- [ ] Replace start_time `<Input type="time">` (line ~249) with `<select>`
  - Populate options from `generateTimeSlotOptions(availability.data)`
  - Show loading state while fetching
  - Show "No available times" if empty
  - Disable when no venue/date selected
- [ ] Replace end_time `<Input type="time">` (line ~271) with `<select>`
  - Populate options from `getAvailableEndTimes(availability.data, watchedStartTime)`
  - Reset when start time changes
  - Disable when no start time selected
- [ ] Update form onChange handlers
  - Remove time input formatting logic (`.slice(0,5)` etc.)
  - Ensure values are still in HH:MM:SS format for backend
- [ ] Add loading/empty states for better UX

---

### Step 3: Verify Backend Integration
- [ ] Test that `useVenueAvailability` hook works correctly
  - Currently fetches directly from Supabase client
  - Verify it returns correct availability data
- [ ] Verify booking creation still works
  - Check `BookingService.createBooking()` still validates availability
  - Ensure time format (HH:MM:SS) is still correct
  - Test conflict detection still works

---

### Step 4: Testing

#### Manual Testing
- [ ] Select venue → Select date → See available start times
- [ ] Select start time → See filtered end time options
- [ ] Change date → Availability updates correctly
- [ ] Change venue → Availability updates correctly
- [ ] Select date with no availability → See "No available times"
- [ ] Submit booking → Booking saves successfully
- [ ] Verify booking appears in bookings list

#### Edge Cases
- [ ] Multiple availability blocks on same day (e.g., 9am-12pm, 2pm-5pm)
- [ ] Overlapping availability blocks
- [ ] No availability for selected date
- [ ] Invalid venue ID
- [ ] Network error during availability fetch
- [ ] Rapid date/venue changes (race conditions)

---

### Step 5: UI/UX Polish
- [ ] Loading spinner while fetching availability
- [ ] Clear error messages
- [ ] Helpful placeholder text
- [ ] Disabled states are visually clear
- [ ] Responsive design (mobile-friendly dropdowns)
- [ ] Accessibility (keyboard navigation, screen readers)

---

## Code Locations Reference

### Files to Create
- `src/utils/availabilityHelpers.ts` - NEW

### Files to Modify
- `src/components/forms/create-booking-form.tsx` - MODIFY (main changes)

### Files to Verify (may not need changes)
- `src/hooks/useVenues.ts` - Already has `useVenueAvailability` hook
- `src/services/bookingService.ts` - Already checks availability
- `src/utils/conflictDetection.ts` - Already has availability validation

---

## Key Decisions Needed

1. **Time Slot Granularity**
   - Option A: Hourly (e.g., 9:00, 10:00, 11:00)
   - Option B: 30-minute intervals (e.g., 9:00, 9:30, 10:00)
   - Option C: 15-minute intervals (e.g., 9:00, 9:15, 9:30, 9:45)
   - **Recommendation**: Start with hourly, can make configurable later

2. **Time Display Format**
   - Option A: 24-hour format (09:00, 10:00, 14:00)
   - Option B: 12-hour format (9:00 AM, 10:00 AM, 2:00 PM)
   - **Recommendation**: 12-hour for better UX

3. **Multiple Availability Blocks Handling**
   - If venue has 9am-12pm AND 2pm-5pm availability
   - Show as continuous list or separate sections?
   - **Recommendation**: Single merged list

4. **Minimum/Maximum Booking Duration**
   - Enforce minimum (e.g., 1 hour)?
   - Enforce maximum (e.g., 4 hours)?
   - **Recommendation**: Start without limits, add later if needed

---

## Implementation Order

1. ✅ **Create utility functions** (can test independently)
2. ✅ **Update form component** (main UI changes)
3. ✅ **Test end-to-end** (verify everything works)
4. ✅ **Polish UI/UX** (loading states, error handling)

---

## Success Criteria

- [ ] Users can only select from available time slots
- [ ] Start time selection filters end time options
- [ ] Booking submission saves correctly to database
- [ ] All error states handled gracefully
- [ ] Loading states provide good UX
- [ ] Existing booking functionality still works

