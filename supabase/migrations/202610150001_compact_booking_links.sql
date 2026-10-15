begin;
-- Keep existing 256-bit links valid; new links use 128 random bits (22 URL characters).
alter table public.booking_links drop constraint booking_links_token_check;
alter table public.booking_links add constraint booking_links_token_check
  check (token ~ '^([a-f0-9]{32}|[a-f0-9]{64})$');
commit;
