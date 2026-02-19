-- Add 'authorized' status to payment_status enum for setup intent (card hold) flow
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'authorized' AFTER 'pending';

-- Add stripe_setup_intent_id column to payments table for tracking setup intents
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT UNIQUE;

-- Add comment for documentation
COMMENT ON COLUMN payments.stripe_setup_intent_id IS 'Stripe SetupIntent ID for card-on-file authorization (used when payment is deferred until approval)';;
