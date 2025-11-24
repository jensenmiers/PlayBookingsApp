# Deprecated Database Triggers and Functions

This document tracks database triggers and functions that have been deprecated in favor of API backend logic.

## Deprecated Business Logic Functions

The following functions have been **deprecated** and renamed with `_deprecated` suffix. Their business logic has been moved to the API service layer:

### 1. `check_booking_conflicts_deprecated()`
- **Original**: `check_booking_conflicts()`
- **Replaced by**: `bookingService.checkConflicts()` + `conflictDetection.ts` utilities
- **Location**: `src/services/bookingService.ts`, `src/utils/conflictDetection.ts`
- **Status**: Trigger dropped, function renamed and deprecated

### 2. `check_recurring_booking_conflicts_deprecated()`
- **Original**: `check_recurring_booking_conflicts()`
- **Replaced by**: `bookingService.checkConflicts()` + `conflictDetection.ts` utilities
- **Location**: `src/services/bookingService.ts`, `src/utils/conflictDetection.ts`
- **Status**: Trigger dropped, function renamed and deprecated

### 3. `generate_recurring_bookings_deprecated()`
- **Original**: `generate_recurring_bookings()`
- **Replaced by**: `bookingService.generateRecurringBookings()` + `recurringGenerator.ts` utilities
- **Location**: `src/services/bookingService.ts`, `src/utils/recurringGenerator.ts`
- **Status**: Trigger dropped, function renamed and deprecated

### 4. `check_cancellation_policy_deprecated()`
- **Original**: `check_cancellation_policy()`
- **Replaced by**: `bookingService.cancelBooking()` with `isWithinCancellationWindow()` validation
- **Location**: `src/services/bookingService.ts`, `src/utils/dateHelpers.ts`
- **Status**: Trigger dropped, function renamed and deprecated

### 5. `check_insurance_requirements_deprecated()`
- **Original**: `check_insurance_requirements()`
- **Replaced by**: `bookingService.confirmBooking()` with insurance validation
- **Location**: `src/services/bookingService.ts`
- **Status**: Trigger dropped, function renamed and deprecated

## Dropped Triggers

The following triggers have been **dropped** as their logic is now in the API:

- `check_booking_conflicts_trigger` (on `bookings` table)
- `check_recurring_booking_conflicts_trigger` (on `recurring_bookings` table)
- `generate_recurring_bookings_trigger` (on `bookings` table)
- `check_cancellation_policy_trigger` (on `bookings` table)
- `check_insurance_requirements_trigger` (on `bookings` table)

## Active Triggers and Functions

The following triggers and functions remain **active**:

### Utility Triggers (Keep Active)
- `update_venues_updated_at` - Auto-updates `updated_at` timestamps
- `update_bookings_updated_at` - Auto-updates `updated_at` timestamps
- `update_recurring_bookings_updated_at` - Auto-updates `updated_at` timestamps
- `update_insurance_documents_updated_at` - Auto-updates `updated_at` timestamps
- `update_payments_updated_at` - Auto-updates `updated_at` timestamps
- `update_subscriptions_updated_at` - Auto-updates `updated_at` timestamps

**Reason**: Simple utility functions that maintain data consistency. No business logic.

### Audit Triggers (Keep Active as Backup)
- `audit_venues_trigger` - Logs changes to venues table
- `audit_bookings_trigger` - Logs changes to bookings table
- `audit_recurring_bookings_trigger` - Logs changes to recurring_bookings table
- `audit_insurance_trigger` - Logs changes to insurance_documents table
- `audit_payments_trigger` - Logs changes to payments table
- `audit_subscriptions_trigger` - Logs changes to subscriptions table
- `audit_messages_trigger` - Logs changes to messages table
- `audit_users_trigger` - Logs changes to users table

**Reason**: Serves as backup to `auditService`. Both API and triggers log audit trails for defense in depth.

### Auth Triggers (Keep Active)
- `on_auth_user_created` - Creates user profile after auth signup
- Function: `handle_new_user()`

**Reason**: Auth-related, not booking business logic.

## Migration Details

**Migration Name**: `deprecate_business_logic_triggers`
**Applied**: Via Supabase MCP
**Date**: 2025-01-15

The migration:
1. Drops all business logic triggers
2. Renames functions to `*_deprecated` suffix
3. Adds deprecation comments to functions
4. Preserves functions for reference (not deleted)

## API Implementation

All business logic is now implemented in:

- **Service Layer**: `src/services/bookingService.ts`
- **Utilities**: `src/utils/conflictDetection.ts`, `src/utils/recurringGenerator.ts`, `src/utils/dateHelpers.ts`
- **Audit**: `src/services/auditService.ts`
- **API Routes**: `src/app/api/bookings/**/*.ts`

## Benefits of API-Based Logic

1. **Testability**: Business logic can be unit tested
2. **Flexibility**: Easier to modify and extend business rules
3. **Error Handling**: Better error messages and handling
4. **Observability**: Can add logging, metrics, monitoring
5. **Versioning**: API versioning allows gradual changes
6. **Debugging**: Easier to debug application code than database functions

## Future Cleanup

Once the API has been thoroughly tested in production, the deprecated functions can be completely removed:

```sql
DROP FUNCTION IF EXISTS check_booking_conflicts_deprecated();
DROP FUNCTION IF EXISTS check_recurring_booking_conflicts_deprecated();
DROP FUNCTION IF EXISTS generate_recurring_bookings_deprecated();
DROP FUNCTION IF EXISTS check_cancellation_policy_deprecated();
DROP FUNCTION IF EXISTS check_insurance_requirements_deprecated();
```

**Recommendation**: Keep deprecated functions for at least 3-6 months after API deployment to ensure stability.



