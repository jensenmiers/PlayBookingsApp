-- Deprecate database triggers and functions replaced by API backend logic
-- This migration removes business logic triggers that are now handled in the application layer

-- Drop business logic triggers
DROP TRIGGER IF EXISTS check_booking_conflicts_trigger ON public.bookings;
DROP TRIGGER IF EXISTS check_recurring_booking_conflicts_trigger ON public.recurring_bookings;
DROP TRIGGER IF EXISTS generate_recurring_bookings_trigger ON public.bookings;
DROP TRIGGER IF EXISTS check_cancellation_policy_trigger ON public.bookings;
DROP TRIGGER IF EXISTS check_insurance_requirements_trigger ON public.bookings;

-- Rename business logic functions to indicate they are deprecated
-- Using DO blocks to conditionally rename if functions exist
DO $$
BEGIN
  -- Rename check_booking_conflicts
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_booking_conflicts' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.check_booking_conflicts() RENAME TO check_booking_conflicts_deprecated;
  END IF;
  
  -- Rename check_recurring_booking_conflicts
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_recurring_booking_conflicts' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.check_recurring_booking_conflicts() RENAME TO check_recurring_booking_conflicts_deprecated;
  END IF;
  
  -- Rename generate_recurring_bookings
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_recurring_bookings' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.generate_recurring_bookings() RENAME TO generate_recurring_bookings_deprecated;
  END IF;
  
  -- Rename check_cancellation_policy
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_cancellation_policy' AND pronamespace = 'public'::regnamespace) THEN
    ALTER FUNCTION public.check_cancellation_policy() RENAME TO check_cancellation_policy_deprecated;
  END IF;
  
  -- Rename check_insurance_requirements
  IF EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'check_insurance_requirements') THEN
    ALTER FUNCTION public.check_insurance_requirements() RENAME TO check_insurance_requirements_deprecated;
  END IF;
END $$;

-- Add comments to deprecated functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_booking_conflicts_deprecated' AND pronamespace = 'public'::regnamespace) THEN
    COMMENT ON FUNCTION public.check_booking_conflicts_deprecated() IS 'DEPRECATED: Business logic moved to API layer (bookingService.checkConflicts). This function is kept for reference only.';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_recurring_booking_conflicts_deprecated' AND pronamespace = 'public'::regnamespace) THEN
    COMMENT ON FUNCTION public.check_recurring_booking_conflicts_deprecated() IS 'DEPRECATED: Business logic moved to API layer (bookingService + conflictDetection utils). This function is kept for reference only.';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_recurring_bookings_deprecated' AND pronamespace = 'public'::regnamespace) THEN
    COMMENT ON FUNCTION public.generate_recurring_bookings_deprecated() IS 'DEPRECATED: Business logic moved to API layer (bookingService.generateRecurringBookings). This function is kept for reference only.';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_cancellation_policy_deprecated' AND pronamespace = 'public'::regnamespace) THEN
    COMMENT ON FUNCTION public.check_cancellation_policy_deprecated() IS 'DEPRECATED: Business logic moved to API layer (bookingService.cancelBooking with isWithinCancellationWindow). This function is kept for reference only.';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_insurance_requirements_deprecated' AND pronamespace = 'public'::regnamespace) THEN
    COMMENT ON FUNCTION public.check_insurance_requirements_deprecated() IS 'DEPRECATED: Business logic moved to API layer (bookingService.confirmBooking). This function is kept for reference only.';
  END IF;
END $$;

-- Note: We keep the following triggers/functions active:
-- - update_*_updated_at triggers (simple timestamp updates)
-- - audit_*_trigger (can serve as backup to auditService)
-- - handle_new_user trigger (auth-related, not booking logic);
