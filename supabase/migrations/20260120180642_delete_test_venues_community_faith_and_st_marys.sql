-- Delete test venue data for Community Faith Center Gym and St. Mary's Gym
-- First delete related availability records, then the venues

-- Delete availability records for these venues
DELETE FROM availability 
WHERE venue_id IN (
    SELECT id FROM venues 
    WHERE name ILIKE '%Community Faith Center%' 
       OR name ILIKE '%St. Mary%'
);

-- Delete any bookings for these venues (should cascade to related tables)
DELETE FROM bookings 
WHERE venue_id IN (
    SELECT id FROM venues 
    WHERE name ILIKE '%Community Faith Center%' 
       OR name ILIKE '%St. Mary%'
);

-- Delete any recurring bookings for these venues
DELETE FROM recurring_bookings 
WHERE venue_id IN (
    SELECT id FROM venues 
    WHERE name ILIKE '%Community Faith Center%' 
       OR name ILIKE '%St. Mary%'
);

-- Delete any payments for these venues
DELETE FROM payments 
WHERE venue_id IN (
    SELECT id FROM venues 
    WHERE name ILIKE '%Community Faith Center%' 
       OR name ILIKE '%St. Mary%'
);

-- Finally delete the venues themselves
DELETE FROM venues 
WHERE name ILIKE '%Community Faith Center%' 
   OR name ILIKE '%St. Mary%';;
