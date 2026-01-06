---
name: Navigation Updates
overview: Update the universal navbar with new links and role-based visibility, and make the dashboard layout conditionally show either the sidebar (for venue owners) or the universal navbar (for renters).
todos:
  - id: update-navbar
    content: Update universal navbar with new links and role-based Dashboard visibility
    status: completed
  - id: update-dashboard-layout
    content: Make dashboard layout conditionally render sidebar vs universal navbar based on user role
    status: completed
    dependencies:
      - update-navbar
  - id: protect-dashboard-route
    content: Add redirect logic to prevent unauthorized users and renters from accessing /dashboard, redirecting them to /bookings instead
    status: completed
    dependencies:
      - update-dashboard-layout
---

# Navigation System Updates

## Overview

Update the navigation system to provide role-appropriate experiences: renters see the universal navbar everywhere, while venue owners see the dashboard sidebar on dashboard routes.

## Architecture

```mermaid
flowchart TD
    subgraph signed_out [Signed Out Users]
        A[Universal Navbar] --> B[Venues link]
        A --> C[Get Started button]
    end
    
    subgraph signed_in [Signed In Users]
        D[Universal Navbar] --> E[Availability → /search]
        D --> F[Bookings → /bookings]
        D --> G[Venues → /venues]
        D --> H{is_venue_owner?}
        H -->|Yes| I[Dashboard → /dashboard]
        H -->|No| J[No Dashboard link]
    end
    
    subgraph dashboard_routes [Dashboard Routes /bookings, /dashboard, etc]
        K{User Role Check}
        K -->|Venue Owner| L[Dashboard Sidebar]
        K -->|Renter| M[Universal Navbar]
    end
```



## Changes

### 1. Universal Navbar - [navigation.tsx](src/components/layout/navigation.tsx)

**For signed-out users:**

- Change "Browse" to "Venues" (still routes to `/venues`)

**For signed-in users:**

- Change "Home" to "Availability" and route to `/search` instead of `/venues`
- Add "Bookings" link routing to `/bookings`
- Add "Venues" link routing to `/venues`
- Only show "Dashboard" link if `user.is_venue_owner` is true

### 2. Dashboard Layout - [(dashboard)/layout.tsx](src/app/\\(dashboard)/layout.tsx)

Make the layout role-aware:

- Use `useCurrentUser` hook to check user role
- If user is a venue owner (`is_venue_owner`): render the current `SidebarNavigation`
- If user is a renter only (not a venue owner): render the universal `Navigation` component instead of the sidebar
- Show a loading state while user role is being determined

### 3. Dashboard Route Protection - [(dashboard)/layout.tsx](src/app/\\(dashboard)/layout.tsx)

Add access control to restrict `/dashboard` to venue owners only:

- When an unauthorized user (not authenticated) or a renter (non-venue owner) tries to access any dashboard route (including `/dashboard`), redirect them to `/bookings`