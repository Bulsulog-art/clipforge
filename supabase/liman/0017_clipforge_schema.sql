-- ============================================================
-- ClipForge on Liman (self-hosted Supabase, liman.bulsulabs.com)
--
-- Moves ClipForge's own data off the cloud project (rgtxjjnalesquhnexfez,
-- "AuraGlow", which also hosts AuraGlow/Telve/Govori). On the cloud project
-- ClipForge lives in its own `clipforge` schema, and the web app, the worker
-- and the shipped iOS app all address it as `.schema("clipforge")`. Liman has
-- no `clipforge` schema, so the same schema is created here and no table is
-- renamed. Every object below is new and ClipForge's own; nothing that
-- another Liman app created is touched.
--
-- Mirrors the cloud schema as of 2026-11-14 (enums, tables, constraints,
-- indexes, RLS policies, views, functions), with these deliberate changes,
-- all stricter than the cloud:
--
--   * No trigger on the shared auth.users. The cloud's
--     on_auth_user_created_clipforge gave every new auth user a ClipForge
--     profile (and so every AuraGlow/Govori signup got one). On Liman the
--     web app creates the profile the first time a signed-in user reaches it
--     (lib/supabase/clipforge-profile.ts) and marks the account with
--     app_metadata product/products "clipforge".
--   * Table grants: service_role gets everything; authenticated gets
--     select/insert/update/delete only (RLS still decides which rows); anon
--     gets nothing except reading the music catalog. The cloud granted every
--     privilege (incl. TRUNCATE) on every table to anon and authenticated.
--   * Policies the cloud wrote "to public" are written "to authenticated"
--     (they all compare auth.uid(), which anon never has).
--   * Function EXECUTE: the credit functions (grant_credits, consume_credits,
--     record_refund, refill_free_credits) and reap_stuck_jobs are
--     service_role only; only the worker and webhooks call them, with the
--     service key. The cloud let anon call record_refund/reap_stuck_jobs and
--     let any signed-in user call consume_credits for any user id.
--     redeem_referral stays callable by authenticated users (it reads
--     auth.uid() itself).
--   * profiles: authenticated users may update only display_name,
--     avatar_url, niche, brand_color and push_preferences (the cloud let
--     them rewrite their own credits_balance and tier).
--   * credit_event_kind gains 'referral_bonus'. redeem_referral passes it,
--     but the cloud enum lacks it, so every redemption there fails.
--   * Storage policies use storage.foldername(name)[1] instead of the
--     cloud's public.clipforge_owner_prefix helper, so nothing is added to
--     Liman's shared public schema. An object outside a folder matches no
--     owner, which is stricter than split_part.
--
-- Not on Liman yet (needed at cut-over, outside this file):
--   * PostgREST must expose the schema: add `clipforge` to the Liman stack's
--     PGRST_DB_SCHEMAS (today: public,storage,graphql_public).
--   * Data and storage objects: scripts/clipforge-liman-copy.py.
-- ============================================================

create schema if not exists clipforge;
grant usage on schema clipforge to anon, authenticated, service_role;

-- ---------- enums ----------
create type clipforge.avatar_job_status as enum ('queued', 'synthesizing_voice', 'lipsyncing', 'rendering', 'ready', 'failed');
create type clipforge.clip_status as enum ('draft', 'rendering', 'ready', 'scheduled', 'published', 'failed');
create type clipforge.credit_event_kind as enum ('purchase', 'subscription_grant', 'free_monthly', 'consume', 'refund', 'admin_grant', 'bonus', 'referral_bonus');
create type clipforge.derivative_kind as enum ('face_swap', 'translation');
create type clipforge.derivative_status as enum ('queued', 'processing', 'ready', 'failed');
create type clipforge.job_status as enum ('queued', 'planning', 'gathering', 'transcribing', 'scoring', 'rendering', 'uploading', 'ready', 'failed');
create type clipforge.music_mood as enum ('hype', 'chill', 'motivational', 'dramatic', 'lofi', 'cinematic', 'comedic');
create type clipforge.platform as enum ('tiktok', 'instagram', 'youtube', 'x', 'facebook', 'linkedin');
create type clipforge.publish_status as enum ('pending', 'publishing', 'published', 'failed');
create type clipforge.subscription_tier as enum ('free', 'starter', 'pro', 'agency');

-- ---------- sequences ----------
create sequence clipforge.analytics_snapshots_id_seq;
create sequence clipforge.trend_snapshots_id_seq;

-- ---------- tables ----------
create table clipforge.profiles (id uuid not null, email text not null, display_name text, avatar_url text, tier clipforge.subscription_tier default 'free'::clipforge.subscription_tier not null, revenuecat_app_user_id text, niche text, brand_color text default '#FF3366'::text, watermark_enabled boolean default true not null, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, credits_balance integer default 0 not null, credits_lifetime_purchased integer default 0 not null, credits_lifetime_consumed integer default 0 not null, free_credits_refilled_at date, push_preferences jsonb default '{}'::jsonb not null, signup_source jsonb);
create table clipforge.analytics_snapshots (id bigint default nextval('clipforge.analytics_snapshots_id_seq'::regclass) not null, publish_id uuid not null, user_id uuid not null, fetched_at timestamp with time zone default now() not null, views integer, likes integer, comments integer, shares integer, watch_time_seconds bigint, meta jsonb);
create table clipforge.announcements (id uuid default gen_random_uuid() not null, title text not null, body text not null, cta_text text, cta_url text, starts_at timestamp with time zone default now() not null, ends_at timestamp with time zone, min_app_version text, max_app_version text, created_at timestamp with time zone default now() not null);
create table clipforge.app_events (id uuid default gen_random_uuid() not null, user_id uuid, event text not null, props jsonb, app_version text, os_version text, created_at timestamp with time zone default now() not null);
create table clipforge.avatar_jobs (id uuid default gen_random_uuid() not null, user_id uuid not null, script text not null, avatar_id uuid, custom_image_path text, voice_id text not null, niche text default 'motivation'::text, bg_music_enabled boolean default true not null, status clipforge.avatar_job_status default 'queued'::clipforge.avatar_job_status not null, progress integer default 0 not null, error_message text, clip_id uuid, created_at timestamp with time zone default now() not null, finished_at timestamp with time zone, voice_clone_id uuid);
create table clipforge.avatars (id uuid default gen_random_uuid() not null, name text not null, description text, image_path text not null, default_voice_id text, persona text default 'neutral'::text not null, is_active boolean default true not null, sort_order integer default 0 not null, created_at timestamp with time zone default now() not null);
create table clipforge.brand_kits (id uuid default extensions.uuid_generate_v4() not null, user_id uuid not null, name text not null, primary_color text default '#FF3366'::text not null, secondary_color text default '#1A1A1A'::text not null, font_family text default 'Inter'::text not null, logo_path text, intro_path text, outro_path text, caption_style jsonb, is_default boolean default false not null, created_at timestamp with time zone default now() not null);
create table clipforge.clinics (id uuid default gen_random_uuid() not null, owner_id uuid not null, profile jsonb not null, logo_path text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table clipforge.clip_branding (user_id uuid not null, logo_path text not null, "position" text default 'bottom-right'::text not null, opacity numeric(3,2) default 0.85 not null, updated_at timestamp with time zone default now() not null);
create table clipforge.clip_derivatives (id uuid default gen_random_uuid() not null, source_clip_id uuid not null, user_id uuid not null, kind clipforge.derivative_kind not null, status clipforge.derivative_status default 'queued'::clipforge.derivative_status not null, progress integer default 0 not null, target_face_path text, target_language text, voice_clone boolean default false not null, storage_path text, thumbnail_path text, error_message text, credits_charged integer default 0 not null, created_at timestamp with time zone default now() not null, finished_at timestamp with time zone);
create table clipforge.clips (id uuid default extensions.uuid_generate_v4() not null, job_id uuid, user_id uuid not null, index_in_job integer not null, start_seconds numeric(10,3) not null, end_seconds numeric(10,3) not null, viral_score numeric(5,2), hook text, caption text, hashtags text[], storage_path text, thumbnail_path text, aspect_ratio text default '9:16'::text not null, duration_seconds numeric(6,2), status clipforge.clip_status default 'draft'::clipforge.clip_status not null, render_config jsonb, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null, bg_music_track_id uuid, source_kind text default 'pipeline'::text not null, is_favorite boolean default false not null);
create table clipforge.credit_events (id uuid default gen_random_uuid() not null, user_id uuid not null, kind clipforge.credit_event_kind not null, amount integer not null, reason text, reference text, metadata jsonb, balance_after integer not null, created_at timestamp with time zone default now() not null);
create table clipforge.dental_items (id uuid default gen_random_uuid() not null, clinic_id uuid not null, owner_id uuid not null, kind text not null, week_of date default (date_trunc('week'::text, now()))::date not null, status text not null, approval text default 'pending'::text not null, approval_note text, title text not null, topic jsonb, plan jsonb, copy jsonb, spoken text, checks jsonb, findings jsonb default '[]'::jsonb not null, shoot_card jsonb, qa jsonb, video_path text, thumb_path text, source_path text, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table clipforge.feature_flags (key text not null, enabled boolean default false not null, rollout_percent integer default 100 not null, conditions jsonb default '{}'::jsonb not null, description text, updated_at timestamp with time zone default now() not null);
create table clipforge.feedback (id uuid default gen_random_uuid() not null, user_id uuid not null, message text not null, app_version text, os_version text, device_model text, created_at timestamp with time zone default now() not null);
create table clipforge.music_tracks (id uuid default gen_random_uuid() not null, name text not null, artist text, mood clipforge.music_mood default 'motivational'::clipforge.music_mood not null, niches text[] default '{}'::text[] not null, duration_sec integer not null, storage_path text not null, energy integer default 5 not null, license text default 'CC0'::text not null, attribution text, is_active boolean default true not null, created_at timestamp with time zone default now() not null);
create table clipforge.publishes (id uuid default extensions.uuid_generate_v4() not null, user_id uuid not null, clip_id uuid not null, social_account_id uuid not null, platform clipforge.platform not null, scheduled_for timestamp with time zone, published_at timestamp with time zone, status clipforge.publish_status default 'pending'::clipforge.publish_status not null, external_post_id text, external_url text, caption text, error_message text, created_at timestamp with time zone default now() not null);
create table clipforge.push_tokens (id uuid default gen_random_uuid() not null, user_id uuid not null, token text not null, platform text default 'ios'::text not null, last_seen_at timestamp with time zone default now() not null, created_at timestamp with time zone default now() not null);
create table clipforge.referral_codes (user_id uuid not null, code text not null, created_at timestamp with time zone default now() not null);
create table clipforge.referrals (id uuid default gen_random_uuid() not null, inviter_user_id uuid not null, invitee_user_id uuid not null, code text not null, inviter_credits_granted integer default 5 not null, invitee_credits_granted integer default 5 not null, created_at timestamp with time zone default now() not null);
create table clipforge.social_accounts (id uuid default extensions.uuid_generate_v4() not null, user_id uuid not null, platform clipforge.platform not null, external_user_id text not null, username text, display_name text, access_token text not null, refresh_token text, expires_at timestamp with time zone, scope text, meta jsonb, created_at timestamp with time zone default now() not null, updated_at timestamp with time zone default now() not null);
create table clipforge.trend_snapshots (id bigint default nextval('clipforge.trend_snapshots_id_seq'::regclass) not null, niche text not null, generated_at timestamp with time zone default now() not null, source text default 'gpt'::text not null, items jsonb not null, meta jsonb);
create table clipforge.usage_quotas (user_id uuid not null, period_start date default date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) not null, videos_used integer default 0 not null, minutes_processed integer default 0 not null, clips_generated integer default 0 not null);
create table clipforge.video_jobs (id uuid default extensions.uuid_generate_v4() not null, user_id uuid not null, source_type text not null, source_url text, storage_path text, title text, duration_seconds integer, niche text, language text default 'en'::text, status clipforge.job_status default 'queued'::clipforge.job_status not null, progress integer default 0 not null, transcript jsonb, error_message text, created_at timestamp with time zone default now() not null, finished_at timestamp with time zone, bg_music_enabled boolean default true not null, bg_music_mood clipforge.music_mood, clip_prompt text, caption_style text, aspect_ratio text, scene_plan jsonb, source_asset_paths text[]);
create table clipforge.voice_clones (id uuid default gen_random_uuid() not null, user_id uuid not null, name text not null, elevenlabs_voice_id text not null, sample_path text, status text default 'ready'::text not null, error_message text, created_at timestamp with time zone default now() not null);

alter sequence clipforge.analytics_snapshots_id_seq owned by clipforge.analytics_snapshots.id;
alter sequence clipforge.trend_snapshots_id_seq owned by clipforge.trend_snapshots.id;

-- ---------- primary keys, unique and check constraints ----------
alter table clipforge.analytics_snapshots add constraint analytics_snapshots_pkey PRIMARY KEY (id);
alter table clipforge.announcements add constraint announcements_body_check CHECK (((char_length(body) >= 1) AND (char_length(body) <= 400)));
alter table clipforge.announcements add constraint announcements_pkey PRIMARY KEY (id);
alter table clipforge.announcements add constraint announcements_title_check CHECK (((char_length(title) >= 1) AND (char_length(title) <= 80)));
alter table clipforge.app_events add constraint app_events_event_check CHECK (((char_length(event) >= 1) AND (char_length(event) <= 80)));
alter table clipforge.app_events add constraint app_events_pkey PRIMARY KEY (id);
alter table clipforge.avatar_jobs add constraint avatar_jobs_check CHECK (((avatar_id IS NOT NULL) OR (custom_image_path IS NOT NULL)));
alter table clipforge.avatar_jobs add constraint avatar_jobs_pkey PRIMARY KEY (id);
alter table clipforge.avatar_jobs add constraint avatar_jobs_script_check CHECK (((length(script) >= 10) AND (length(script) <= 1200)));
alter table clipforge.avatars add constraint avatars_pkey PRIMARY KEY (id);
alter table clipforge.brand_kits add constraint brand_kits_pkey PRIMARY KEY (id);
alter table clipforge.clinics add constraint clinics_owner_id_key UNIQUE (owner_id);
alter table clipforge.clinics add constraint clinics_pkey PRIMARY KEY (id);
alter table clipforge.clip_branding add constraint clip_branding_opacity_check CHECK (((opacity >= 0.10) AND (opacity <= 1.00)));
alter table clipforge.clip_branding add constraint clip_branding_pkey PRIMARY KEY (user_id);
alter table clipforge.clip_branding add constraint clip_branding_position_check CHECK (("position" = ANY (ARRAY['top-left'::text, 'top-right'::text, 'bottom-left'::text, 'bottom-right'::text])));
alter table clipforge.clip_derivatives add constraint clip_derivatives_pkey PRIMARY KEY (id);
alter table clipforge.clips add constraint clips_pkey PRIMARY KEY (id);
alter table clipforge.clips add constraint clips_source_kind_check CHECK ((source_kind = ANY (ARRAY['pipeline'::text, 'avatar'::text])));
alter table clipforge.credit_events add constraint credit_events_pkey PRIMARY KEY (id);
alter table clipforge.dental_items add constraint dental_items_approval_check CHECK ((approval = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
alter table clipforge.dental_items add constraint dental_items_kind_check CHECK ((kind = ANY (ARRAY['generated'::text, 'recording'::text])));
alter table clipforge.dental_items add constraint dental_items_pkey PRIMARY KEY (id);
alter table clipforge.dental_items add constraint dental_items_status_check CHECK ((status = ANY (ARRAY['ready'::text, 'flagged'::text, 'rejected'::text])));
alter table clipforge.feature_flags add constraint feature_flags_key_check CHECK (((char_length(key) >= 1) AND (char_length(key) <= 80)));
alter table clipforge.feature_flags add constraint feature_flags_pkey PRIMARY KEY (key);
alter table clipforge.feature_flags add constraint feature_flags_rollout_percent_check CHECK (((rollout_percent >= 0) AND (rollout_percent <= 100)));
alter table clipforge.feedback add constraint feedback_message_check CHECK (((char_length(message) >= 1) AND (char_length(message) <= 4000)));
alter table clipforge.feedback add constraint feedback_pkey PRIMARY KEY (id);
alter table clipforge.music_tracks add constraint music_tracks_duration_sec_check CHECK ((duration_sec > 0));
alter table clipforge.music_tracks add constraint music_tracks_energy_check CHECK (((energy >= 1) AND (energy <= 10)));
alter table clipforge.music_tracks add constraint music_tracks_pkey PRIMARY KEY (id);
alter table clipforge.profiles add constraint profiles_email_key UNIQUE (email);
alter table clipforge.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table clipforge.profiles add constraint profiles_revenuecat_app_user_id_key UNIQUE (revenuecat_app_user_id);
alter table clipforge.publishes add constraint publishes_pkey PRIMARY KEY (id);
alter table clipforge.push_tokens add constraint push_tokens_pkey PRIMARY KEY (id);
alter table clipforge.push_tokens add constraint push_tokens_user_id_token_key UNIQUE (user_id, token);
alter table clipforge.referral_codes add constraint referral_codes_code_check CHECK ((char_length(code) = 8));
alter table clipforge.referral_codes add constraint referral_codes_code_key UNIQUE (code);
alter table clipforge.referral_codes add constraint referral_codes_pkey PRIMARY KEY (user_id);
alter table clipforge.referrals add constraint referrals_invitee_user_id_key UNIQUE (invitee_user_id);
alter table clipforge.referrals add constraint referrals_pkey PRIMARY KEY (id);
alter table clipforge.social_accounts add constraint social_accounts_pkey PRIMARY KEY (id);
alter table clipforge.social_accounts add constraint social_accounts_user_id_platform_external_user_id_key UNIQUE (user_id, platform, external_user_id);
alter table clipforge.trend_snapshots add constraint trend_snapshots_pkey PRIMARY KEY (id);
alter table clipforge.usage_quotas add constraint usage_quotas_pkey PRIMARY KEY (user_id, period_start);
alter table clipforge.video_jobs add constraint video_jobs_pkey PRIMARY KEY (id);
alter table clipforge.video_jobs add constraint video_jobs_source_type_check CHECK ((source_type = ANY (ARRAY['upload'::text, 'youtube'::text, 'tiktok_url'::text, 'generate'::text])));
alter table clipforge.voice_clones add constraint voice_clones_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 60)));
alter table clipforge.voice_clones add constraint voice_clones_pkey PRIMARY KEY (id);
alter table clipforge.voice_clones add constraint voice_clones_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text])));

-- ---------- foreign keys ----------
alter table clipforge.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table clipforge.analytics_snapshots add constraint analytics_snapshots_publish_id_fkey FOREIGN KEY (publish_id) REFERENCES clipforge.publishes(id) ON DELETE CASCADE;
alter table clipforge.analytics_snapshots add constraint analytics_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.app_events add constraint app_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.avatar_jobs add constraint avatar_jobs_avatar_id_fkey FOREIGN KEY (avatar_id) REFERENCES clipforge.avatars(id) ON DELETE SET NULL;
alter table clipforge.avatar_jobs add constraint avatar_jobs_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES clipforge.clips(id) ON DELETE SET NULL;
alter table clipforge.avatar_jobs add constraint avatar_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.avatar_jobs add constraint avatar_jobs_voice_clone_id_fkey FOREIGN KEY (voice_clone_id) REFERENCES clipforge.voice_clones(id) ON DELETE SET NULL;
alter table clipforge.brand_kits add constraint brand_kits_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.clinics add constraint clinics_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.clip_branding add constraint clip_branding_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.clip_derivatives add constraint clip_derivatives_source_clip_id_fkey FOREIGN KEY (source_clip_id) REFERENCES clipforge.clips(id) ON DELETE CASCADE;
alter table clipforge.clip_derivatives add constraint clip_derivatives_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.clips add constraint clips_bg_music_track_id_fkey FOREIGN KEY (bg_music_track_id) REFERENCES clipforge.music_tracks(id) ON DELETE SET NULL;
alter table clipforge.clips add constraint clips_job_id_fkey FOREIGN KEY (job_id) REFERENCES clipforge.video_jobs(id) ON DELETE CASCADE;
alter table clipforge.clips add constraint clips_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.credit_events add constraint credit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.dental_items add constraint dental_items_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clipforge.clinics(id) ON DELETE CASCADE;
alter table clipforge.dental_items add constraint dental_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.feedback add constraint feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.publishes add constraint publishes_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES clipforge.clips(id) ON DELETE CASCADE;
alter table clipforge.publishes add constraint publishes_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES clipforge.social_accounts(id) ON DELETE CASCADE;
alter table clipforge.publishes add constraint publishes_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.push_tokens add constraint push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.referral_codes add constraint referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.referrals add constraint referrals_invitee_user_id_fkey FOREIGN KEY (invitee_user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.referrals add constraint referrals_inviter_user_id_fkey FOREIGN KEY (inviter_user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.social_accounts add constraint social_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.usage_quotas add constraint usage_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.video_jobs add constraint video_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;
alter table clipforge.voice_clones add constraint voice_clones_user_id_fkey FOREIGN KEY (user_id) REFERENCES clipforge.profiles(id) ON DELETE CASCADE;

-- ---------- indexes ----------
CREATE INDEX analytics_snapshots_publish_id_fetched_at_idx ON clipforge.analytics_snapshots USING btree (publish_id, fetched_at DESC);
CREATE INDEX announcements_active_idx ON clipforge.announcements USING btree (starts_at, ends_at);
CREATE INDEX app_events_event_idx ON clipforge.app_events USING btree (event, created_at DESC);
CREATE INDEX app_events_user_idx ON clipforge.app_events USING btree (user_id, created_at DESC);
CREATE INDEX avatar_jobs_status_idx ON clipforge.avatar_jobs USING btree (status);
CREATE INDEX avatar_jobs_user_id_created_at_idx ON clipforge.avatar_jobs USING btree (user_id, created_at DESC);
CREATE INDEX avatar_jobs_voice_clone_idx ON clipforge.avatar_jobs USING btree (voice_clone_id) WHERE (voice_clone_id IS NOT NULL);
CREATE INDEX avatars_is_active_sort_order_idx ON clipforge.avatars USING btree (is_active, sort_order);
CREATE INDEX clip_derivatives_source_clip_id_idx ON clipforge.clip_derivatives USING btree (source_clip_id);
CREATE INDEX clip_derivatives_status_kind_idx ON clipforge.clip_derivatives USING btree (status, kind);
CREATE INDEX clip_derivatives_user_id_created_at_idx ON clipforge.clip_derivatives USING btree (user_id, created_at DESC);
CREATE INDEX clips_favorites_idx ON clipforge.clips USING btree (user_id, created_at DESC) WHERE (is_favorite = true);
CREATE INDEX clips_job_id_idx ON clipforge.clips USING btree (job_id);
CREATE INDEX clips_status_idx ON clipforge.clips USING btree (status);
CREATE INDEX clips_user_id_created_at_idx ON clipforge.clips USING btree (user_id, created_at DESC);
CREATE INDEX credit_events_ref_idx ON clipforge.credit_events USING btree (reference);
CREATE INDEX credit_events_user_idx ON clipforge.credit_events USING btree (user_id, created_at DESC);
CREATE INDEX dental_items_clinic_week ON clipforge.dental_items USING btree (clinic_id, week_of DESC);
CREATE INDEX feedback_user_id_idx ON clipforge.feedback USING btree (user_id, created_at DESC);
CREATE INDEX music_tracks_is_active_mood_idx ON clipforge.music_tracks USING btree (is_active, mood);
CREATE INDEX music_tracks_niches_idx ON clipforge.music_tracks USING gin (niches);
CREATE INDEX profiles_revenuecat_app_user_id_idx ON clipforge.profiles USING btree (revenuecat_app_user_id);
CREATE INDEX publishes_status_scheduled_for_idx ON clipforge.publishes USING btree (status, scheduled_for);
CREATE INDEX publishes_user_id_scheduled_for_idx ON clipforge.publishes USING btree (user_id, scheduled_for);
CREATE INDEX push_tokens_user_idx ON clipforge.push_tokens USING btree (user_id);
CREATE INDEX referral_codes_code_idx ON clipforge.referral_codes USING btree (code);
CREATE INDEX referrals_inviter_idx ON clipforge.referrals USING btree (inviter_user_id, created_at DESC);
CREATE INDEX trend_snapshots_niche_idx ON clipforge.trend_snapshots USING btree (niche, generated_at DESC);
CREATE INDEX video_jobs_status_idx ON clipforge.video_jobs USING btree (status);
CREATE INDEX video_jobs_user_id_created_at_idx ON clipforge.video_jobs USING btree (user_id, created_at DESC);
CREATE INDEX voice_clones_user_idx ON clipforge.voice_clones USING btree (user_id, created_at DESC);

-- ---------- functions ----------
create function clipforge.set_updated_at() returns trigger language plpgsql set search_path to '' as $$
begin new.updated_at = now(); return new; end;
$$;

create function clipforge.grant_credits(p_user_id uuid, p_amount integer, p_kind clipforge.credit_event_kind, p_reason text default null, p_reference text default null, p_metadata jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path to 'clipforge', 'public' as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'grant_credits requires positive amount';
  end if;

  if p_reference is not null then
    if exists (
      select 1 from clipforge.credit_events
      where reference = p_reference and kind = p_kind
    ) then
      return (select credits_balance from clipforge.profiles where id = p_user_id);
    end if;
  end if;

  update clipforge.profiles
  set credits_balance = credits_balance + p_amount,
      credits_lifetime_purchased = case
        when p_kind in ('purchase','subscription_grant') then credits_lifetime_purchased + p_amount
        else credits_lifetime_purchased
      end
  where id = p_user_id
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'profile not found: %', p_user_id;
  end if;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, metadata, balance_after)
  values (p_user_id, p_kind, p_amount, p_reason, p_reference, p_metadata, new_balance);

  return new_balance;
end;
$$;

create function clipforge.consume_credits(p_user_id uuid, p_amount integer, p_reason text default null, p_reference text default null)
returns integer language plpgsql security definer set search_path to 'clipforge', 'public' as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'consume_credits requires positive amount';
  end if;

  -- Idempotency guard: a BullMQ retry re-running the same job/derivative must
  -- not charge twice.
  if p_reference is not null then
    if exists (
      select 1 from clipforge.credit_events
      where reference = p_reference and kind = 'consume'
    ) then
      return (select credits_balance from clipforge.profiles where id = p_user_id);
    end if;
  end if;

  update clipforge.profiles
  set credits_balance = credits_balance - p_amount,
      credits_lifetime_consumed = credits_lifetime_consumed + p_amount
  where id = p_user_id
    and credits_balance >= p_amount
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, balance_after)
  values (p_user_id, 'consume', -p_amount, p_reason, p_reference, new_balance);

  return new_balance;
end;
$$;

create function clipforge.record_refund(p_user_id uuid, p_amount integer, p_reason text default null, p_reference text default null)
returns integer language plpgsql security definer set search_path to 'clipforge', 'public' as $$
declare
  cur integer;
  deduct integer;
  new_balance integer;
begin
  if p_amount < 0 then
    raise exception 'record_refund requires non-negative amount';
  end if;

  if p_reference is not null and exists (
    select 1 from clipforge.credit_events
    where reference = p_reference and kind = 'refund'
  ) then
    return (select credits_balance from clipforge.profiles where id = p_user_id);
  end if;

  select credits_balance into cur from clipforge.profiles where id = p_user_id for update;
  if cur is null then
    raise exception 'profile not found: %', p_user_id;
  end if;

  deduct := least(cur, p_amount);

  update clipforge.profiles
    set credits_balance = credits_balance - deduct
    where id = p_user_id
    returning credits_balance into new_balance;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, metadata, balance_after)
  values (
    p_user_id, 'refund', -deduct, p_reason, p_reference,
    jsonb_build_object('refund_requested', p_amount, 'clawed_back', deduct),
    new_balance
  );

  return new_balance;
end;
$$;

create function clipforge.refill_free_credits(p_amount integer default 0)
returns integer language plpgsql security definer set search_path to 'clipforge', 'public' as $$
begin
  -- The lifetime free model means no monthly refill. Use grant_credits()
  -- directly if a one-off support gift is needed.
  return 0;
end;
$$;

create function clipforge.redeem_referral(p_code text)
returns table(ok boolean, error text, inviter uuid)
language plpgsql security definer set search_path to 'clipforge', 'public' as $$
declare
  v_invitee uuid := auth.uid();
  v_inviter uuid;
  v_count   int;
begin
  if v_invitee is null then
    return query select false, 'unauthenticated', null::uuid;
    return;
  end if;

  select user_id into v_inviter
    from clipforge.referral_codes
   where code = p_code
   limit 1;
  if v_inviter is null then
    return query select false, 'code_not_found', null::uuid;
    return;
  end if;
  if v_inviter = v_invitee then
    return query select false, 'self_referral', null::uuid;
    return;
  end if;

  select count(*) into v_count
    from clipforge.referrals
   where inviter_user_id = v_inviter;
  if v_count >= 20 then
    return query select false, 'inviter_cap_reached', null::uuid;
    return;
  end if;

  begin
    insert into clipforge.referrals (
      inviter_user_id, invitee_user_id, code,
      inviter_credits_granted, invitee_credits_granted
    ) values (v_inviter, v_invitee, p_code, 5, 5);
  exception when unique_violation then
    return query select false, 'already_redeemed', null::uuid;
    return;
  end;

  perform clipforge.grant_credits(
    p_user_id => v_inviter,
    p_amount  => 5,
    p_kind    => 'referral_bonus',
    p_reason  => 'invited a friend',
    p_reference => p_code,
    p_metadata => jsonb_build_object('invitee', v_invitee::text)
  );
  perform clipforge.grant_credits(
    p_user_id => v_invitee,
    p_amount  => 5,
    p_kind    => 'referral_bonus',
    p_reason  => 'redeemed referral code',
    p_reference => p_code,
    p_metadata => jsonb_build_object('inviter', v_inviter::text)
  );

  return query select true, null::text, v_inviter;
end;
$$;

create function clipforge.reap_stuck_jobs(p_older_than interval default '01:00:00'::interval)
returns integer language plpgsql security definer set search_path to 'clipforge', 'public' as $$
declare
  r record;
  reaped integer := 0;
  consumed integer;
begin
  for r in
    select id, user_id from clipforge.video_jobs
    where status in ('queued','transcribing','scoring','rendering','planning','gathering','uploading')
      and finished_at is null
      and created_at < now() - p_older_than
  loop
    update clipforge.video_jobs
      set status = 'failed', error_message = 'Timed out — please try again', finished_at = now()
      where id = r.id;
    select coalesce(-sum(amount), 0) into consumed
      from clipforge.credit_events where reference = r.id::text and kind = 'consume';
    if consumed > 0 then
      perform clipforge.grant_credits(r.user_id, consumed, 'refund', 'stuck job auto-refund', r.id::text);
    end if;
    reaped := reaped + 1;
  end loop;

  for r in
    select id, user_id from clipforge.avatar_jobs
    where status in ('queued','synthesizing_voice','lipsyncing','rendering')
      and finished_at is null
      and created_at < now() - p_older_than
  loop
    update clipforge.avatar_jobs
      set status = 'failed', error_message = 'Timed out — please try again', finished_at = now()
      where id = r.id;
    select coalesce(-sum(amount), 0) into consumed
      from clipforge.credit_events where reference = r.id::text and kind = 'consume';
    if consumed > 0 then
      perform clipforge.grant_credits(r.user_id, consumed, 'refund', 'stuck job auto-refund', r.id::text);
    end if;
    reaped := reaped + 1;
  end loop;

  for r in
    select id, user_id from clipforge.clip_derivatives
    where status in ('queued','processing')
      and finished_at is null
      and created_at < now() - p_older_than
  loop
    update clipforge.clip_derivatives
      set status = 'failed', error_message = 'Timed out — please try again', finished_at = now()
      where id = r.id;
    select coalesce(-sum(amount), 0) into consumed
      from clipforge.credit_events where reference = r.id::text and kind = 'consume';
    if consumed > 0 then
      perform clipforge.grant_credits(r.user_id, consumed, 'refund', 'stuck job auto-refund', r.id::text);
    end if;
    reaped := reaped + 1;
  end loop;

  return reaped;
end;
$$;

revoke all on function clipforge.set_updated_at() from public;
revoke all on function clipforge.grant_credits(uuid, integer, clipforge.credit_event_kind, text, text, jsonb) from public;
revoke all on function clipforge.consume_credits(uuid, integer, text, text) from public;
revoke all on function clipforge.record_refund(uuid, integer, text, text) from public;
revoke all on function clipforge.refill_free_credits(integer) from public;
revoke all on function clipforge.redeem_referral(text) from public;
revoke all on function clipforge.reap_stuck_jobs(interval) from public;
grant execute on function clipforge.grant_credits(uuid, integer, clipforge.credit_event_kind, text, text, jsonb) to service_role;
grant execute on function clipforge.consume_credits(uuid, integer, text, text) to service_role;
grant execute on function clipforge.record_refund(uuid, integer, text, text) to service_role;
grant execute on function clipforge.refill_free_credits(integer) to service_role;
grant execute on function clipforge.reap_stuck_jobs(interval) to service_role;
grant execute on function clipforge.redeem_referral(text) to authenticated, service_role;

-- ---------- triggers (ClipForge tables only) ----------
create trigger trg_profiles_updated before update on clipforge.profiles for each row execute function clipforge.set_updated_at();
create trigger trg_clips_updated before update on clipforge.clips for each row execute function clipforge.set_updated_at();
create trigger trg_social_updated before update on clipforge.social_accounts for each row execute function clipforge.set_updated_at();
create trigger trg_derivatives_updated before update on clipforge.clip_derivatives for each row execute function clipforge.set_updated_at();

-- ---------- views (security_invoker: the caller's RLS applies) ----------
create view clipforge.v_clip_with_derivatives with (security_invoker=true) as
 SELECT c.id, c.job_id, c.user_id, c.index_in_job, c.start_seconds, c.end_seconds, c.viral_score, c.hook, c.caption,
    c.hashtags, c.storage_path, c.thumbnail_path, c.aspect_ratio, c.duration_seconds, c.status, c.render_config,
    c.created_at, c.updated_at, c.bg_music_track_id, c.source_kind,
    COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'status', d.status, 'target_language', d.target_language, 'storage_path', d.storage_path, 'thumbnail_path', d.thumbnail_path, 'progress', d.progress) ORDER BY d.created_at DESC) FILTER (WHERE (d.id IS NOT NULL)), '[]'::jsonb) AS derivatives
   FROM (clipforge.clips c
     LEFT JOIN clipforge.clip_derivatives d ON ((d.source_clip_id = c.id)))
  GROUP BY c.id;

create view clipforge.v_trend_latest with (security_invoker=true) as
 SELECT DISTINCT ON (niche) niche, generated_at, source, items
   FROM clipforge.trend_snapshots
  ORDER BY niche, generated_at DESC;

create view clipforge.v_user_credits with (security_invoker=true) as
 SELECT id AS user_id, tier, credits_balance, credits_lifetime_purchased, credits_lifetime_consumed,
        CASE tier
            WHEN 'free'::clipforge.subscription_tier THEN 0
            WHEN 'starter'::clipforge.subscription_tier THEN 40
            ELSE 0
        END AS monthly_grant
   FROM clipforge.profiles p;

create view clipforge.v_user_quota with (security_invoker=true) as
 SELECT p.id AS user_id, p.tier,
    COALESCE(q.videos_used, 0) AS videos_used,
    COALESCE(q.minutes_processed, 0) AS minutes_processed,
    COALESCE(q.clips_generated, 0) AS clips_generated,
        CASE p.tier
            WHEN 'free'::clipforge.subscription_tier THEN 2
            WHEN 'starter'::clipforge.subscription_tier THEN 10
            WHEN 'pro'::clipforge.subscription_tier THEN 50
            WHEN 'agency'::clipforge.subscription_tier THEN 250
            ELSE NULL::integer
        END AS videos_limit
   FROM (clipforge.profiles p
     LEFT JOIN clipforge.usage_quotas q ON (((q.user_id = p.id) AND (q.period_start = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)))));

-- ---------- row level security ----------
alter table clipforge.analytics_snapshots enable row level security;
alter table clipforge.announcements enable row level security;
alter table clipforge.app_events enable row level security;
alter table clipforge.avatar_jobs enable row level security;
alter table clipforge.avatars enable row level security;
alter table clipforge.brand_kits enable row level security;
alter table clipforge.clinics enable row level security;
alter table clipforge.clip_branding enable row level security;
alter table clipforge.clip_derivatives enable row level security;
alter table clipforge.clips enable row level security;
alter table clipforge.credit_events enable row level security;
alter table clipforge.dental_items enable row level security;
alter table clipforge.feature_flags enable row level security;
alter table clipforge.feedback enable row level security;
alter table clipforge.music_tracks enable row level security;
alter table clipforge.profiles enable row level security;
alter table clipforge.publishes enable row level security;
alter table clipforge.push_tokens enable row level security;
alter table clipforge.referral_codes enable row level security;
alter table clipforge.referrals enable row level security;
alter table clipforge.social_accounts enable row level security;
alter table clipforge.trend_snapshots enable row level security;
alter table clipforge.usage_quotas enable row level security;
alter table clipforge.video_jobs enable row level security;
alter table clipforge.voice_clones enable row level security;

create policy "analytics self read" on clipforge.analytics_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "announcements no read" on clipforge.announcements for select to authenticated using (false);
create policy "events insert self" on clipforge.app_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "events no read" on clipforge.app_events for select to authenticated using (false);
create policy "avatar_job self delete" on clipforge.avatar_jobs for delete to authenticated using ((select auth.uid()) = user_id);
create policy "avatar_job self insert" on clipforge.avatar_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "avatar_job self read" on clipforge.avatar_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy "avatar list" on clipforge.avatars for select to authenticated using (is_active);
create policy "brand self all" on clipforge.brand_kits for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "clinic self insert" on clipforge.clinics for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "clinic self read" on clipforge.clinics for select to authenticated using ((select auth.uid()) = owner_id);
create policy "clinic self write" on clipforge.clinics for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "branding self all" on clipforge.clip_branding for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "branding self read" on clipforge.clip_branding for select to authenticated using ((select auth.uid()) = user_id);
create policy "derivative self all" on clipforge.clip_derivatives for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "clip self delete" on clipforge.clips for delete to authenticated using ((select auth.uid()) = user_id);
create policy "clip self read" on clipforge.clips for select to authenticated using ((select auth.uid()) = user_id);
create policy "clip self update" on clipforge.clips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "credit events self read" on clipforge.credit_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "dental item self approve" on clipforge.dental_items for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "dental item self read" on clipforge.dental_items for select to authenticated using ((select auth.uid()) = owner_id);
create policy "flags no read" on clipforge.feature_flags for select to authenticated using (false);
create policy "feedback insert self" on clipforge.feedback for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "feedback no select" on clipforge.feedback for select to authenticated using (false);
create policy "music_tracks public read active" on clipforge.music_tracks for select to anon, authenticated using (is_active = true);
create policy "profile self read" on clipforge.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profile self update" on clipforge.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "publish self all" on clipforge.publishes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push self all" on clipforge.push_tokens for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ref_codes self insert" on clipforge.referral_codes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ref_codes self read" on clipforge.referral_codes for select to authenticated using ((select auth.uid()) = user_id);
create policy "referrals party read" on clipforge.referrals for select to authenticated using (((select auth.uid()) = inviter_user_id) or ((select auth.uid()) = invitee_user_id));
create policy "social self all" on clipforge.social_accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trends read all" on clipforge.trend_snapshots for select to authenticated using (true);
create policy "usage self read" on clipforge.usage_quotas for select to authenticated using ((select auth.uid()) = user_id);
create policy "job self delete" on clipforge.video_jobs for delete to authenticated using ((select auth.uid()) = user_id);
create policy "job self insert" on clipforge.video_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "job self read" on clipforge.video_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy "voice_clones self delete" on clipforge.voice_clones for delete to authenticated using ((select auth.uid()) = user_id);
create policy "voice_clones self read" on clipforge.voice_clones for select to authenticated using ((select auth.uid()) = user_id);

-- ---------- table grants ----------
grant all on all tables in schema clipforge to service_role;
grant all on all sequences in schema clipforge to service_role;
grant select, insert, update, delete on all tables in schema clipforge to authenticated;
grant usage, select on all sequences in schema clipforge to authenticated;
grant select on clipforge.music_tracks to anon;
-- profiles: a signed-in user may read their row and change only the
-- self-service columns. Credits, tier, email and the RevenueCat id are
-- written by the service role (webhooks, worker). The cloud let the
-- "profile self update" policy change any column, credits_balance included.
revoke insert, update, delete on clipforge.profiles from authenticated;
grant update (display_name, avatar_url, niche, brand_color, push_preferences) on clipforge.profiles to authenticated;

-- ---------- storage ----------
-- Bucket names are ClipForge's own (no clipforge-* bucket exists on Liman).
-- Public flags match the cloud. clipforge-faces and clipforge-uploads are
-- referenced by the code (branding, voice clones, account deletion) and had
-- policies on the cloud but no bucket; they are created private.
insert into storage.buckets (id, name, public) values
  ('clipforge-avatars', 'clipforge-avatars', true),
  ('clipforge-music', 'clipforge-music', false),
  ('clipforge-thumbnails', 'clipforge-thumbnails', true),
  ('clipforge-videos-raw', 'clipforge-videos-raw', false),
  ('clipforge-videos-rendered', 'clipforge-videos-rendered', false),
  ('clipforge-faces', 'clipforge-faces', false),
  ('clipforge-uploads', 'clipforge-uploads', false);

-- Owner-only access to user buckets: the first folder is the owner's id.
do $$
declare b text;
begin
  foreach b in array array['clipforge-uploads','clipforge-videos-raw','clipforge-videos-rendered','clipforge-thumbnails','clipforge-faces'] loop
    execute format($p$create policy %I on storage.objects for select to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$p$, 'clipforge owner select ' || b, b);
    execute format($p$create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$p$, 'clipforge owner insert ' || b, b);
    execute format($p$create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$p$, 'clipforge owner update ' || b, b, b);
    execute format($p$create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$p$, 'clipforge owner delete ' || b, b);
  end loop;
end$$;

-- The music catalog is readable by anyone (cloud: "public read clipforge-music").
create policy "clipforge public read clipforge-music" on storage.objects for select to anon, authenticated using (bucket_id = 'clipforge-music');

-- ---------- scheduled job (same as the cloud) ----------
select cron.schedule('clipforge-trend-heartbeat', '0 7 * * *',
  $$ insert into clipforge.trend_snapshots (niche, source, items) values ('_heartbeat', 'cron', '[]'::jsonb); $$);
