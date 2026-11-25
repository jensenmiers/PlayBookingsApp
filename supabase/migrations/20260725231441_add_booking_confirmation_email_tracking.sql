alter table public.bookings
  add column confirmation_email_sent_at timestamptz,
  add column confirmation_email_resend_id text;

comment on column public.bookings.confirmation_email_sent_at is
  'When Resend accepted the transactional booking confirmation email.';

comment on column public.bookings.confirmation_email_resend_id is
  'Resend email ID for the accepted booking confirmation email.';
