# PlayBookings Demo Script
## User Persona: Athletic Director (Primary Renter, Occasional Venue Owner)

---

## SCENE 1: LAUNCH & BROWSE (NO LOGIN REQUIRED)
**Duration: 3-4 minutes**

### Setup
1. **Navigate to homepage** (`/`)
   - Shows marketing page with value proposition
   - Highlights: "Connect underutilized indoor basketball courts with trusted renters"
   - Shows features: Easy Scheduling, Trust & Safety, Community Connection, Local Focus

2. **Click "Home" or navigate to `/book` or `/search`**
   - **Key Point:** User can browse without logging in!
   - Navigation shows: Home, Sign In button (instead of Dashboard/Profile)
   - User lands on booking/browse interface immediately
   - No authentication gate - free browsing experience

3. **Browse experience (unauthenticated)**
   - User can see all venues, search, use calendar/map views
   - Full browsing capability without account
   - Navigation remains accessible for exploration

---

## SCENE 2: SEARCH & BROWSE (NO AUTHENTICATION NEEDED)
**Duration: 3-4 minutes**

### Option A: Browse via Venues Tab (Default View)
1. **On `/book` or `/search` page - "Venues" tab (default active)**
   - View available venues as cards/grid
   - Each card shows: Venue name, location, hourly rate, instant booking badge (if applicable)
   - Venues listed with key info at a glance
   - **No login required** - full venue browsing enabled

2. **Search functionality**
   - Use search bar to filter: "high school basketball court" or specific city
   - Results update dynamically
   - Can browse through multiple pages if many results
   - All search features work without authentication

### Option B: Calendar View
1. **Switch to "Calendar" tab**
   - View venues/availability on calendar
   - See available time slots visually
   - Click dates to see available venues
   - Full calendar exploration without login

### Option C: Map View
1. **Switch to "Map" tab**
   - See venues plotted on map
   - Geographic view helps find nearby schools
   - Click markers for quick venue info
   - Map browsing fully functional without account

### Alternative Entry: Browse All Venues
1. **Navigate to `/venues` page** (via navigation if available, or directly)
   - Full list of all venues accessible
   - Search by name, city, or address
   - Pagination support
   - Click any venue card to see details
   - **Zero friction** - no authentication barrier

---

## SCENE 3: VENUE DETAILS & AVAILABILITY (PUBLIC ACCESS)
**Duration: 2-3 minutes**

1. **Click on a venue** (e.g., "Lincoln High School Gymnasium")
   - Navigate to `/venue/lincoln-high-school-gymnasium`
   - View detailed page:
     - Large venue photo
     - Full address and location
     - Hourly rate prominently displayed
     - Features: Instant Booking badge (if enabled), Insurance Required badge
     - Description/about section
     - Amenities list
   - **All details visible** - public venue information
   
2. **Review availability slots**
   - Scroll to availability section
   - See available time slots for upcoming dates
   - Slots show: Date, start time, end time, price
   - Note which venues have "Instant Booking" enabled vs. require approval
   - User can explore availability without any login

---

## SCENE 4: INITIATE BOOKING (AUTHENTICATION REQUIRED AT SUBMISSION)
**Duration: 3-4 minutes**

### Scenario A: User Starts Booking Process (Unauthenticated)

1. **Click "Book Now" or select available time slot**
   - Booking form opens/modal appears
   - **User can fill out the form** - no authentication required yet
   - Form fields available:
     - Venue (pre-selected)
     - Date (pre-selected from slot)
     - Start time (pre-selected)
     - End time (pre-selected or adjust)
     - Optional: Recurring booking (weekly/monthly)
     - Optional: Notes (e.g., "Youth basketball practice")
   - User can explore pricing, see conflicts, adjust times

2. **User fills out booking details**
   - Selects date, time, duration
   - Adds notes if needed
   - Sees calculated total amount
   - Reviews all booking information

3. **User clicks "Submit" or "Confirm Booking"**
   - **AUTHENTICATION GATE APPEARS HERE** 🚪
   - Auth Required Dialog appears:
     - Title: "Sign In Required"
     - Message: "Please sign in to complete your booking"
     - "Sign In" button
   - **Key UX Point:** User has already invested time in finding venue and filling form - now motivated to sign up

---

## SCENE 5: AUTHENTICATION FLOW (ONLY WHEN NEEDED)
**Duration: 2-3 minutes**

### Option A: New User Registration

1. **Click "Sign In" from Auth Dialog**
   - Redirected to `/auth/login?returnTo=/venue/[venue-name]` (or current page)
   - User sees login page

2. **Click "Sign Up" or "Get Started" link**
   - Navigate to registration page
   - Fill out registration form:
     - Email address
     - Password
     - Name (first name, last name)
     - Role selection: Renter (default) or Venue Owner
   - Submit registration

3. **After registration/login**
   - User is redirected back to the page they were on (`returnTo` parameter)
   - Booking form context is preserved (or form reopens)
   - User can now submit the booking

### Option B: Existing User Login

1. **Click "Sign In" from Auth Dialog**
   - Redirected to login page with `returnTo` parameter
   - Enter email and password
   - Click "Sign In"

2. **After login**
   - Redirected back to booking flow
   - Can immediately submit booking

---

## SCENE 6: COMPLETE BOOKING SUBMISSION
**Duration: 1-2 minutes**

1. **After authentication, submit booking**
   - Booking form still has user's selections
   - Click "Submit" again
   - This time, booking is successfully created

2. **Booking created successfully**
   - Success message appears
   - Booking status: "Pending" (for venues requiring approval) or immediate confirmation (if instant booking)
   - User can now view booking in their account

---

## SCENE 7A: BOOK INSTANT BOOKING (Authenticated)
**Duration: 1-2 minutes**

1. **Select a venue with Instant Booking enabled** (user now authenticated)
   - Look for venues with the lightning bolt/Instant Booking badge
   
2. **Complete booking form and submit**
   - Form submission succeeds (user is authenticated)
   - Booking created with status "pending" (may auto-confirm for instant bookings)
   - Success message appears

---

## SCENE 7B: BOOK PENDING BOOKING (Authenticated)
**Duration: 1-2 minutes**

1. **Select a venue WITHOUT Instant Booking** (user now authenticated)
   - No lightning bolt badge visible
   - Insurance Required badge visible
   
2. **Complete booking form and submit**
   - Form submission succeeds (user is authenticated)
   - Booking created with status "pending"
   - Message: "Your booking request has been submitted and is pending approval from the venue owner"
   - Note that insurance may need to be verified if required

---

## SCENE 8: VIEW DETAILED BOOKING INFO (Renter View)
**Duration: 2-3 minutes**

### Access Bookings (Requires Authentication)
1. **Navigate to Dashboard** → Click "Bookings" in sidebar
   - OR directly go to `/dashboard/bookings`
   - **Note:** Dashboard access requires authentication (protected route)
   - See list of all bookings (pending, confirmed, cancelled, completed)

2. **Filter bookings** (optional)
   - Use filter button
   - Filter by status: Pending, Confirmed, Completed, Cancelled
   - Filter by date range
   - Clear filters to see all

3. **View booking details**
   - Click on any booking from the list
   - OR from booking list, click on a booking card
   - Navigate to booking detail page/component

### Booking Detail Information Shows:
- **Header:**
  - Booking ID (shortened)
  - Status badge (color-coded: Yellow for Pending, Green for Confirmed, etc.)
  
- **Booking Info Cards:**
  - Date: Formatted date (e.g., "January 25, 2025")
  - Time: Start time - End time (e.g., "3:00 PM - 5:00 PM")
  - Venue: Venue name with full address
  - Total Amount: Formatted price (e.g., "$150.00")

- **Additional Details:**
  - Notes (if provided)
  - Recurring booking info (if applicable): "Weekly recurring booking until [date]"
  
- **Actions Available:**
  - View venue details (link)
  - Cancel booking (if status allows)
  - Contact venue owner (if feature exists)

### Show Multiple Bookings
- Demonstrate viewing multiple bookings with different statuses:
  - One "Pending" booking (awaiting approval)
  - One "Confirmed" booking (ready to use)
  - One "Completed" booking (past booking)
- Show how status badges help distinguish quickly

---

## SCENE 9: LIST OWN VENUE (Occasional Use Case)
**Duration: 2-3 minutes**

1. **Navigate to Dashboard** → "Listings" in sidebar
   - Go to `/dashboard/listings`
   - **Note:** Dashboard access requires authentication
   - View current listings (if any)
   
2. **Create New Listing** (if feature available)
   - Fill in venue information:
     - Name: "Westfield High School Gym"
     - Address, City, State, ZIP
     - Description
     - Hourly rate
     - Toggle: Instant Booking (on/off)
     - Toggle: Insurance Required (typically on)
     - Upload photos
     - Add amenities
   - Save listing
   
3. **Manage Availability** (if feature available)
   - Set available time slots
   - Mark dates/times as available or unavailable
   - Set advance booking window

---

## SCENE 10: DASHBOARD OVERVIEW (Authenticated Only)
**Duration: 1-2 minutes**

1. **Navigate to `/dashboard`**
   - **Authentication required** - protected route
   - See overview/stats:
     - Total bookings (as renter)
     - Upcoming bookings
     - Recent activity
     - Venue listings count (if owner)
   
2. **Quick navigation highlights:**
   - Bookings: View all bookings
   - Listings: Manage venues (if owner)
   - Messages: Communication with owners/renters
   - Payouts: Revenue from listings (if owner)
   - Settings: Account settings

---

## KEY DEMO TALKING POINTS

### For Browse-Without-Login Flow:
- **"The beauty of PlayBookings is that you can explore all available venues without creating an account. This removes friction and lets you see exactly what's available before committing."**
- **"No sign-up required to browse - we only ask you to create an account when you're ready to actually make a booking."**
- "As an athletic director, I can search by location, view venues on a map, check availability on a calendar, and compare rates - all before logging in."

### For Booking Submission & Auth Gate:
- **"Once you've found the perfect venue and time slot, filling out the booking form is straightforward. We only require sign-up at the moment of submission - when you click 'Book Now' - because that's when we need to store your booking data."**
- **"The authentication prompt appears at the perfect moment - after you've invested time in finding and selecting what you want. This creates motivation to complete sign-up."**
- "After you sign in, you're seamlessly returned to complete your booking. Your form data and venue selection are preserved."

### For Search/Browse Features:
- "The interface makes it easy to compare rates and see which venues offer instant booking versus those requiring approval."
- "I can filter by location on the map, browse available slots on the calendar, or use the list view to see all options at once."

### For Booking Details:
- "Once I've made bookings, I can see everything in one place - status, dates, venues, and amounts."
- "The status badges help me quickly see what's confirmed and what's still pending approval."
- "I can filter by date range or status to find specific bookings quickly."

### For Listing Own Venue:
- "Sometimes we have unused time in our gym. I can list it here to generate revenue and help other athletic directors in the area."
- "I control availability, pricing, and whether bookings require approval or can be instant."

---

## DEMO FLOW SUMMARY
1. ✅ **Launch** → Marketing page → Browse immediately (no login)
2. ✅ **Search/Browse** → Venues/Calendar/Map views → Full browsing without authentication
3. ✅ **Venue Details** → View all venue info and availability → Public access
4. ✅ **Initiate Booking** → Fill out booking form → No auth required yet
5. ✅ **Authentication Gate** → Click "Submit" → Auth dialog appears → Sign in/Register
6. ✅ **Complete Booking** → After auth, submit booking → Success
7. ✅ **Book (Instant)** → Select instant booking venue → Complete booking → Instant confirmation
8. ✅ **Book (Pending)** → Select venue requiring approval → Submit booking → Pending status
9. ✅ **Detailed Booking Info** → Dashboard (auth required) → View booking list → Click booking → See full details
10. ✅ **List Own Venue** (Optional) → Dashboard → Listings → Create/manage venue

---

## AUTHENTICATION REQUIREMENTS SUMMARY

### ✅ **No Authentication Required:**
- Browse/search venues (`/book`, `/search`, `/venues`)
- View venue details (`/venue/[name]`)
- View availability and pricing
- Fill out booking form (before submission)
- Marketing/landing pages

### 🔒 **Authentication Required:**
- Submit booking (API endpoint requires auth)
- View dashboard (`/dashboard/*`)
- View bookings list (`/dashboard/bookings`)
- Create/manage venue listings (`/dashboard/listings`)
- Access user profile/settings

---

## ESTIMATED TOTAL DEMO TIME: 18-22 minutes