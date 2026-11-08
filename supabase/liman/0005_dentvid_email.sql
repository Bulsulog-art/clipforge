-- ============================================================
-- DentVideo lifecycle emails on Liman — additive only, NOT applied
-- automatically. Apply by hand after 0001–0004 (Liman SQL editor or psql),
-- then run the checks at the bottom. Idempotent; safe to run twice.
--
-- dentvid_clinics.email_opt_out_at
--     Set when the clinic clicks "unsubscribe" in a reminder (signed link,
--     web/src/app/api/dentvideo/unsubscribe). Stops every non-transactional
--     email (the unpaid-clinic reminders). Emails about videos the clinic
--     has paid for ("your videos are ready") are service mail and still go.
--
-- dentvid_email_log
--     One row per (clinic, kind) — the idempotency key for lifecycle mail.
--     The row is written *before* sending (a claim); a failed send removes
--     it again so the next hourly run can retry. unique(clinic_id, kind)
--     makes a second send impossible even with two runs racing.
--       welcome         after the first successful payment (Dodo webhook)
--       nudge_preview   ~24 h after the clinic step, still unpaid
--       nudge_offer     ~72 h after the clinic step, still unpaid (last one)
--     Rows go when the clinic (or the account) is deleted.
--
-- Until this is applied the app skips lifecycle mail and logs that once;
-- nothing else changes.
-- ============================================================

alter table public.dentvid_clinics add column if not exists email_opt_out_at timestamptz;

create table if not exists public.dentvid_email_log (
  clinic_id  uuid not null references public.dentvid_clinics(id) on delete cascade,
  kind       text not null check (kind in ('welcome', 'nudge_preview', 'nudge_offer')),
  sent_at    timestamptz not null default now(),
  constraint dentvid_email_log_once unique (clinic_id, kind)
);

-- Service role only: no policies, so owners (anon / authenticated) can neither
-- read nor write it through the REST API.
alter table public.dentvid_email_log enable row level security;

-- The hourly reminder query: unpaid clinics that have not opted out, by age.
create index if not exists dentvid_clinics_trial_created
  on public.dentvid_clinics (created_at)
  where plan = 'trial' and email_opt_out_at is null;

comment on column public.dentvid_clinics.email_opt_out_at is 'When the clinic unsubscribed from DentVideo reminder emails (null = subscribed).';
comment on table public.dentvid_email_log is 'DentVideo lifecycle emails sent, one row per (clinic, kind): idempotency for welcome / reminder mail.';

-- Checks (run after applying) -------------------------------------------------
-- select column_name from information_schema.columns where table_name = 'dentvid_clinics' and column_name = 'email_opt_out_at';
-- select conname from pg_constraint where conrelid = 'public.dentvid_email_log'::regclass;
-- select relrowsecurity from pg_class where oid = 'public.dentvid_email_log'::regclass;  -- true
