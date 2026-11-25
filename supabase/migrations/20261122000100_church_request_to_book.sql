alter table public.bookings
  add column if not exists activity text;

comment on column public.bookings.activity is
  'What the renter is planning (request-to-book form): a preset label or their own words for "Other".';

alter table public.venue_admin_configs
  add column if not exists request_hint_windows jsonb not null default '[]'::jsonb;

comment on column public.venue_admin_configs.request_hint_windows is
  'Admin-entered "usually open" times shown as suggestions on the request-to-book form. Same shape as operating_hours. Never blocks a request.';
