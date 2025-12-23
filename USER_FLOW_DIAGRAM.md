# User Flow: Availability-Based Booking

## Current Flow (Before Changes)

```
User Opens Booking Form
    ↓
1. Select Venue (dropdown)
    ↓
2. Select Date (date picker OR calendar)
    ↓
3. Enter Start Time (free-form time input) ⚠️ ANY TIME
    ↓
4. Enter End Time (free-form time input) ⚠️ ANY TIME
    ↓
5. System Checks for Conflicts (after entry)
    ↓
6. Submit Booking
    ↓
7. Booking Saved to Database
```

**Problem**: User can enter times that aren't actually available.

---

## New Flow (After Changes)

```
User Opens Booking Form
    ↓
1. Select Venue (dropdown)
    ↓
2. Select Date (date picker OR calendar)
    ↓
3. 🔄 System Fetches Availability from Database
    ↓
   ┌─────────────────────────────────────┐
   │  Availability Data Loaded           │
   │  [Available Blocks: 9am-5pm]        │
   └─────────────────────────────────────┘
    ↓
4. User Sees START TIME Options
   ┌─────────────────────────────────────┐
   │  Start Time: [Dropdown ▼]           │
   │    • 09:00 AM                       │
   │    • 10:00 AM                       │
   │    • 11:00 AM                       │
   │    • 12:00 PM                       │
   │    • 01:00 PM                       │
   │    • ... (only available times)     │
   └─────────────────────────────────────┘
    ↓
5. User Selects Start Time (e.g., "10:00 AM")
    ↓
6. 🔄 System Filters END TIME Options
   (Only shows times after start time, within availability block)
    ↓
7. User Sees END TIME Options
   ┌─────────────────────────────────────┐
   │  End Time: [Dropdown ▼]             │
   │    • 11:00 AM  ← after 10:00 AM    │
   │    • 12:00 PM                       │
   │    • 01:00 PM                       │
   │    • ... (up to availability end)   │
   └─────────────────────────────────────┘
    ↓
8. User Selects End Time (e.g., "12:00 PM")
    ↓
9. Submit Booking
    ↓
10. Booking Saved to Database ✅
```

---

## Edge Case Flows

### No Availability for Selected Date

```
1. Select Venue
    ↓
2. Select Date (e.g., Dec 25)
    ↓
3. 🔄 System Fetches Availability
    ↓
   ┌─────────────────────────────────────┐
   │  No availability found              │
   └─────────────────────────────────────┘
    ↓
4. User Sees:
   ┌─────────────────────────────────────┐
   │  Start Time: [Disabled Dropdown]    │
   │  "No available times for this date" │
   └─────────────────────────────────────┘
   (End time also disabled)
    ↓
   User must select different date
```

### Date/Venue Changes

```
1. User selects Venue A, Date X
    ↓
2. Availability loads for Venue A, Date X
    ↓
3. User changes to Date Y
    ↓
4. 🔄 System refetches availability for Venue A, Date Y
    ↓
5. Start/End time options update
    ↓
6. User changes to Venue B
    ↓
7. 🔄 System refetches availability for Venue B, Date Y
    ↓
8. Start/End time options update again
```

### Start Time Changes

```
1. User selects Start Time: "10:00 AM"
    ↓
2. End Time dropdown shows: 11:00 AM, 12:00 PM, 1:00 PM, ...
    ↓
3. User selects End Time: "1:00 PM"
    ↓
4. User changes Start Time to "2:00 PM"
    ↓
5. 🔄 End Time dropdown resets and shows: 3:00 PM, 4:00 PM, ...
   (Previous selection "1:00 PM" is invalid, so reset)
```

---

## Data Flow

### Frontend → Backend

```
Component State:
  - venueId: "abc-123"
  - date: "2025-01-20"
    ↓
useVenueAvailability Hook
    ↓
Supabase Query:
  SELECT * FROM availability
  WHERE venue_id = 'abc-123'
    AND date = '2025-01-20'
    AND is_available = true
  ORDER BY start_time ASC
    ↓
Returns: [
  { start_time: "09:00:00", end_time: "17:00:00" },
  { start_time: "18:00:00", end_time: "22:00:00" }
]
    ↓
generateTimeSlotOptions()
    ↓
Start Time Options: [
  { value: "09:00:00", label: "9:00 AM" },
  { value: "10:00:00", label: "10:00 AM" },
  ...
]
```

### Booking Submission

```
Form Values:
  - venue_id: "abc-123"
  - date: "2025-01-20"
  - start_time: "10:00:00"  ← from dropdown
  - end_time: "12:00:00"    ← from dropdown
    ↓
API POST /api/bookings
    ↓
BookingService.createBooking()
    ↓
1. Validates availability ✅
2. Checks conflicts ✅
3. Calculates amount ✅
4. Creates booking record
    ↓
Database INSERT into bookings table
```

---

## Key Differences: Before vs After

| Aspect | Before (Free-Form) | After (Availability-Based) |
|--------|-------------------|---------------------------|
| **Start Time** | Any time user types | Only available times shown |
| **End Time** | Any time user types | Only valid times after start |
| **Validation** | After entry (reactive) | Before entry (proactive) |
| **User Experience** | Can enter invalid times | Can only select valid times |
| **Error Messages** | Shows conflict after typing | Prevents invalid selection |
| **Data Source** | User input | Database availability records |

---

## Visual Comparison

### Before
```
Start Time: [09:30] ← User types anything
End Time:   [23:00] ← User types anything
            ↓
        [Check Conflicts] ← Checks after
            ↓
        ❌ Error: Not available
```

### After
```
Start Time: [10:00 AM ▼] ← Only shows available
            • 9:00 AM
            • 10:00 AM ← selected
            • 11:00 AM
            • 12:00 PM

End Time:   [12:00 PM ▼] ← Only valid after start
            • 11:00 AM
            • 12:00 PM ← selected
            • 1:00 PM
            • 2:00 PM

        [Create Booking] ← Valid by design ✅
```

