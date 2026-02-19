-- Enable RLS on recurring_bookings and payments tables
-- Create RLS policies matching bookings table pattern

-- Enable RLS on recurring_bookings
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Recurring bookings policies (matching bookings pattern)
CREATE POLICY "Users can view their own recurring bookings" ON public.recurring_bookings
    FOR SELECT USING (
        renter_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE id = venue_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own recurring bookings" ON public.recurring_bookings
    FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Users can update their own recurring bookings" ON public.recurring_bookings
    FOR UPDATE USING (
        renter_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE id = venue_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all recurring bookings" ON public.recurring_bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Payments policies (matching bookings pattern)
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (
        renter_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE id = venue_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own payments" ON public.payments
    FOR INSERT WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Venue owners can view their venue payments" ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE id = venue_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );;
