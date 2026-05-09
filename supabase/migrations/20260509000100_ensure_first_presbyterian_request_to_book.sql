-- Ensure request-to-book venue mode exists and First Presbyterian uses it.
-- This is safe to run even if the earlier booking_mode migration was skipped.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS booking_mode TEXT;

UPDATE public.venues
SET booking_mode = CASE
  WHEN instant_booking THEN 'instant_slots'
  ELSE 'approval_slots'
END
WHERE booking_mode IS NULL;

UPDATE public.venues
SET booking_mode = 'request_to_book'
WHERE name = 'First Presbyterian Church of Hollywood';

ALTER TABLE public.venues
  ALTER COLUMN booking_mode SET DEFAULT 'approval_slots';

ALTER TABLE public.venues
  ALTER COLUMN booking_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'venues_booking_mode_check'
      AND conrelid = 'public.venues'::regclass
  ) THEN
    ALTER TABLE public.venues
      ADD CONSTRAINT venues_booking_mode_check
      CHECK (booking_mode IN ('instant_slots', 'approval_slots', 'request_to_book'));
  END IF;
END
$$;

COMMENT ON COLUMN public.venues.booking_mode IS
  'Booking surface mode: instant_slots, approval_slots, or request_to_book.';
