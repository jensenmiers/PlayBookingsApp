# Availability-Based Booking Feature Breakdown

## Feature Overview
Change the booking form from free-form time entry to **only showing available time slots** as selectable options, based on availability records in the database.

---

## User Journey / Steps

### Current Flow (To Be Changed)
1. User selects venue
2. User picks a date (free-form date picker)
3. User enters start time (free-form time input)
4. User enters end time (free-form time input)
5. System checks conflicts after entry
6. User submits booking

### New Flow (Target)
1. User selects venue
2. User picks a date
3. **System fetches available time slots for that venue + date**
4. **User selects from available start time options (dropdown/select)**
5. **System filters end time options based on selected start time**
6. **User selects from available end time options (dropdown/select)**
7. User submits booking
8. Booking saves to database

---

## Implementation Tasks Breakdown

### PHASE 1: API Endpoint for Available Time Slots

#### Task 1.1: Create API Route for Available Time Slots
**File**: `src/app/api/venues/[id]/availability/route.ts` (NEW)
- **Purpose**: Fetch available time slots for a venue on a specific date
- **Method**: GET
- **Query Params**: 
  - `date` (YYYY-MM-DD format, required)
- **Response**: Array of available time slots
- **Logic**:
  - Query `availability` table for `venue_id` + `date` + `is_available = true`
  - Order by `start_time` ascending
  - Return array of `Availability` objects
- **Error Handling**: Handle invalid venue ID, invalid date format, database errors

#### Task 1.2: Add Validation Schema
**File**: `src/lib/validations/venue.ts` (NEW or EXTEND)
- Create `getAvailabilitySchema` using Zod
- Validate: `venue_id` (UUID), `date` (YYYY-MM-DD format)
- Export type: `GetAvailabilityInput`

---

### PHASE 2: Frontend Hook for Availability

#### Task 2.1: Create Hook to Fetch Availability
**File**: `src/hooks/useVenues.ts` (EXTEND)
- **Function**: `useVenueAvailability(venueId, date)`
- **Logic**:
  - Accept `venueId: string | null` and `date: string | null`
  - Fetch from new API endpoint
  - Return loading, data, error states
  - Refetch when venueId or date changes
- **Note**: There's already a `useVenueAvailability` hook (line 126), but verify if it needs updates

---

### PHASE 3: Transform Availability Data to Selectable Options

#### Task 3.1: Create Utility Function for Time Slot Options
**File**: `src/utils/availabilityHelpers.ts` (NEW)
- **Function**: `generateTimeSlotOptions(availabilityBlocks: Availability[])`
- **Purpose**: Convert availability blocks into start/end time options
- **Logic**:
  - Take array of availability blocks
  - For each block, generate time options (e.g., hourly slots from start_time to end_time)
  - Return array of `{ value: string, label: string }` objects
  - Format times as "HH:MM" for display (e.g., "09:00", "10:00")
- **Considerations**:
  - Handle overlapping availability blocks (merge or prioritize)
  - Determine slot granularity (hourly? 30-min? configurable?)
  - Handle edge cases (no availability, gaps between blocks)

#### Task 3.2: Create Function to Filter End Times Based on Start Time
**File**: `src/utils/availabilityHelpers.ts` (EXTEND)
- **Function**: `getAvailableEndTimes(availabilityBlocks: Availability[], startTime: string)`
- **Purpose**: Given a start time, return valid end time options
- **Logic**:
  - Find availability block(s) that contain the selected start time
  - Generate end time options that:
    - Are after the start time
    - Are within the availability block's end_time
    - Don't conflict with other bookings (optional - may be handled by backend)
  - Return array of end time options

---

### PHASE 4: Update Booking Form Component

#### Task 4.1: Replace Time Inputs with Select Dropdowns
**File**: `src/components/forms/create-booking-form.tsx` (MODIFY)
- **Changes**:
  - Remove `<Input type="time">` for start_time (lines 249-260)
  - Remove `<Input type="time">` for end_time (lines 264-284)
  - Replace with `<select>` dropdowns
  - Populate options from availability data
- **Logic Flow**:
  1. When venue_id OR date changes → fetch availability
  2. When availability loads → populate start time options
  3. When start time selected → filter and populate end time options
  4. Reset end time when start time changes

#### Task 4.2: Add Availability Fetching Logic
**File**: `src/components/forms/create-booking-form.tsx` (MODIFY)
- Import and use `useVenueAvailability` hook
- Watch `watchedVenueId` and `watchedDate` form fields
- Call hook with these values
- Store availability data in component state or use hook's returned data

#### Task 4.3: Generate Time Slot Options
**File**: `src/components/forms/create-booking-form.tsx` (MODIFY)
- Import availability helper functions
- When availability data loads, call `generateTimeSlotOptions()`
- Store generated options in state or compute on render
- Pass options to start_time `<select>` dropdown

#### Task 4.4: Handle Start Time Selection
**File**: `src/components/forms/create-booking-form.tsx` (MODIFY)
- On start time change:
  - Update form value
  - Call `getAvailableEndTimes()` with selected start time
  - Update end time options
  - Reset end time form value if current selection is invalid

#### Task 4.5: Handle End Time Selection
**File**: `src/components/forms/create-booking-form.tsx` (MODIFY)
- Populate end time dropdown with filtered options from Task 4.4
- Update form value on selection

#### Task 4.6: Update UI/UX
**File**: `src/components/forms/create-booking-form.tsx` (MODIFY)
- Add loading state while fetching availability
- Show "No available times" message if no availability for selected date
- Disable start/end time selects when:
  - No venue selected
  - No date selected
  - Availability is loading
  - No availability exists
- Add helpful descriptions/labels

---

### PHASE 5: Backend Validation (Already Exists, Verify)

#### Task 5.1: Verify Availability Check in Booking Service
**File**: `src/services/bookingService.ts` (VERIFY, may need minor updates)
- **Current**: `checkConflicts()` method already checks availability (line 100)
- **Action**: Ensure it properly validates against availability records
- **Verify**: 
  - Availability check runs before booking creation
  - Proper error messages returned when slot not available
  - Check handles edge cases (partial overlaps, etc.)

#### Task 5.2: Verify Booking Creation Still Works
**File**: `src/services/bookingService.ts` (VERIFY)
- **Current**: `createBooking()` method exists (line 24)
- **Action**: Ensure booking still saves correctly with new time format
- **Verify**: Time format is still HH:MM:SS (should be unchanged)

---

### PHASE 6: Testing Checklist

#### Task 6.1: Unit Tests
- Test `generateTimeSlotOptions()` with various availability block scenarios
- Test `getAvailableEndTimes()` with different start times
- Test edge cases: no availability, overlapping blocks, gaps

#### Task 6.2: Integration Tests
- Test API endpoint returns correct availability data
- Test form populates time options correctly
- Test form submission with selected time slots
- Test error handling (no availability, invalid date, etc.)

#### Task 6.3: User Acceptance Tests
- **Test Case 1**: Select venue → Select date → See available start times → Select start → See valid end times → Submit
- **Test Case 2**: Select date with no availability → See "No available times" message
- **Test Case 3**: Change date → See new availability options
- **Test Case 4**: Change venue → Availability updates correctly
- **Test Case 5**: Submit booking → Booking saves to database with correct times
- **Test Case 6**: Verify booking appears in bookings list after creation

---

## Technical Considerations

### Data Format
- **Database**: Availability stores `start_time` and `end_time` as TIME type (HH:MM:SS)
- **Form**: Form still uses HH:MM:SS format internally
- **Display**: Show times as HH:MM (12-hour or 24-hour format - decide based on UX)

### Slot Granularity
- **Decision Needed**: What time increments? (e.g., hourly, 30-min, 15-min)
- **Recommendation**: Start with hourly, make configurable later
- **Implementation**: Generate options based on granularity (e.g., if hourly, create options every hour within availability block)

### Handling Multiple Availability Blocks
- **Scenario**: Venue might have multiple availability blocks on same day (e.g., 9am-12pm and 2pm-5pm)
- **Approach**: Merge into single list of available time slots, or show as separate options
- **Recommendation**: Merge into single continuous list of available times

### Conflict Detection
- **Current**: System checks conflicts against existing bookings
- **New**: Availability options should already exclude unavailable times
- **Consideration**: Still need conflict check on submit (race condition if someone books same slot)

### Error States
- No availability for selected date
- Failed to fetch availability (network error)
- Invalid venue ID
- Invalid date format
- Venue doesn't exist

---

## Files to Create
1. `src/app/api/venues/[id]/availability/route.ts` (NEW)
2. `src/utils/availabilityHelpers.ts` (NEW)
3. `src/lib/validations/venue.ts` (NEW, if doesn't exist)

## Files to Modify
1. `src/components/forms/create-booking-form.tsx` (MAJOR CHANGES)
2. `src/hooks/useVenues.ts` (EXTEND if needed)
3. `src/services/bookingService.ts` (VERIFY/MINOR UPDATES if needed)

---

## Dependencies
- Existing: `AvailabilityRepository`, `BookingService`, booking form components
- New: API route handler, availability helper utilities
- External: date-fns (already in use), Zod (already in use)

---

## Success Criteria
✅ User can only select from available time slots (no free-form entry)
✅ Available time slots are fetched from database availability records
✅ Start time selection filters end time options appropriately
✅ Booking submission saves correctly to database
✅ Error states are handled gracefully
✅ Loading states provide good UX
✅ All existing booking functionality still works

---

## Implementation Order Recommendation

1. **Phase 1** (API) → Enables data fetching
2. **Phase 3** (Utilities) → Can be developed/tested independently
3. **Phase 2** (Hook) → Connects API to frontend
4. **Phase 4** (Form Updates) → Main UI changes
5. **Phase 5** (Backend Verification) → Ensure everything works together
6. **Phase 6** (Testing) → Verify functionality

---

## Questions to Resolve

1. **Time slot granularity**: Hourly? 30-min? 15-min? Configurable?
2. **Time format**: 12-hour (9:00 AM) or 24-hour (09:00)?
3. **Multiple blocks**: How to handle venue with 9am-12pm AND 2pm-5pm availability?
4. **Minimum booking duration**: Enforce minimum (e.g., 1 hour)?
5. **Maximum booking duration**: Enforce maximum (e.g., 4 hours)?

