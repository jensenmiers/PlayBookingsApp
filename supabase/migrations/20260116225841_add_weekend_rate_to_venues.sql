-- Add weekend_rate column to venues table
-- This allows venues to charge different rates on weekends (Saturday/Sunday)
-- NULL means venue uses the standard hourly_rate for all days

ALTER TABLE venues 
ADD COLUMN weekend_rate numeric CHECK (weekend_rate IS NULL OR weekend_rate > 0);

-- Add comment for documentation
COMMENT ON COLUMN venues.weekend_rate IS 'Optional hourly rate for weekend bookings (Sat/Sun). NULL means use standard hourly_rate.';;
