-- Fix function security by adding SET search_path = public to critical booking functions

-- Fix check_booking_conflicts function
CREATE OR REPLACE FUNCTION check_booking_conflicts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Check if the new booking conflicts with existing bookings
    IF EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE venue_id = NEW.venue_id 
        AND date = NEW.date 
        AND status IN ('confirmed', 'pending')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Booking time conflicts with existing booking';
    END IF;
    
    -- Check if the new booking conflicts with recurring bookings
    IF EXISTS (
        SELECT 1 FROM public.recurring_bookings 
        WHERE venue_id = NEW.venue_id 
        AND date = NEW.date 
        AND status IN ('confirmed', 'pending')
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Booking time conflicts with existing recurring booking';
    END IF;
    
    -- Check if the time slot is available
    IF NOT EXISTS (
        SELECT 1 FROM public.availability 
        WHERE venue_id = NEW.venue_id 
        AND date = NEW.date 
        AND start_time <= NEW.start_time 
        AND end_time >= NEW.end_time 
        AND is_available = true
    ) THEN
        RAISE EXCEPTION 'Requested time slot is not available';
    END IF;
    
    -- Check advance booking policy
    IF NEW.date > CURRENT_DATE + (SELECT max_advance_booking_days FROM public.venues WHERE id = NEW.venue_id) THEN
        RAISE EXCEPTION 'Booking exceeds maximum advance booking period';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix check_recurring_booking_conflicts function
CREATE OR REPLACE FUNCTION check_recurring_booking_conflicts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Check if the new recurring booking conflicts with existing bookings
    IF EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE venue_id = NEW.venue_id 
        AND date = NEW.date 
        AND status IN ('confirmed', 'pending')
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Recurring booking time conflicts with existing booking';
    END IF;
    
    -- Check if the new recurring booking conflicts with other recurring bookings
    IF EXISTS (
        SELECT 1 FROM public.recurring_bookings 
        WHERE venue_id = NEW.venue_id 
        AND date = NEW.date 
        AND status IN ('confirmed', 'pending')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_time < end_time AND NEW.end_time > start_time)
        )
    ) THEN
        RAISE EXCEPTION 'Recurring booking time conflicts with existing recurring booking';
    END IF;
    
    -- Check if the time slot is available
    IF NOT EXISTS (
        SELECT 1 FROM public.availability 
        WHERE venue_id = NEW.venue_id 
        AND date = NEW.date 
        AND start_time <= NEW.start_time 
        AND end_time >= NEW.end_time 
        AND is_available = true
    ) THEN
        RAISE EXCEPTION 'Requested recurring booking time slot is not available';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix check_cancellation_policy function
CREATE OR REPLACE FUNCTION check_cancellation_policy()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Only check when status changes to cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Check if cancellation is within 48 hours
        IF NEW.date <= CURRENT_DATE + INTERVAL '2 days' THEN
            RAISE EXCEPTION 'Cancellations must be made at least 48 hours in advance';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix generate_recurring_bookings function
CREATE OR REPLACE FUNCTION generate_recurring_bookings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    booking_date DATE;
    end_date DATE;
BEGIN
    -- Only process if this is a recurring booking
    IF NEW.recurring_type = 'none' THEN
        RETURN NEW;
    END IF;
    
    -- Set the end date (3 months for weekly, 6 months for monthly)
    IF NEW.recurring_type = 'weekly' THEN
        end_date := NEW.date + INTERVAL '3 months';
    ELSIF NEW.recurring_type = 'monthly' THEN
        end_date := NEW.date + INTERVAL '6 months';
    END IF;
    
    -- Generate individual recurring bookings
    booking_date := NEW.date;
    WHILE booking_date <= end_date LOOP
        -- Skip the original date as it's already in the main bookings table
        IF booking_date != NEW.date THEN
            INSERT INTO public.recurring_bookings (
                parent_booking_id, venue_id, renter_id, date, start_time, end_time,
                status, total_amount, insurance_approved, insurance_required
            ) VALUES (
                NEW.id, NEW.venue_id, NEW.renter_id, booking_date, NEW.start_time, NEW.end_time,
                'pending', NEW.total_amount, NEW.insurance_approved, NEW.insurance_required
            );
        END IF;
        
        -- Move to next occurrence
        IF NEW.recurring_type = 'weekly' THEN
            booking_date := booking_date + INTERVAL '1 week';
        ELSIF NEW.recurring_type = 'monthly' THEN
            booking_date := booking_date + INTERVAL '1 month';
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;;
