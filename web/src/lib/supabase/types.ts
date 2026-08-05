export type SubscriptionTier = "free" | "starter" | "pro" | "agency";
// Two pipelines share this enum: clipping goes queued → transcribing →
// scoring → rendering, prompt→video goes queued → planning → gathering →
// rendering → uploading. Both end at ready or failed.
export type JobStatus =
  | "queued"
  | "planning"
  | "gathering"
  | "transcribing"
  | "scoring"
  | "rendering"
  | "uploading"
  | "ready"
  | "failed";
export type ClipStatus = "draft" | "rendering" | "ready" | "scheduled" | "published" | "failed";
export type Platform = "tiktok" | "instagram" | "youtube" | "x" | "facebook" | "linkedin";
export type PublishStatus = "pending" | "publishing" | "published" | "failed";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: SubscriptionTier;
  revenuecat_app_user_id: string | null;
  niche: string | null;
  brand_color: string;
  watermark_enabled: boolean;
  /** Renders left. One credit per generated video; refunded when one fails. */
  credits_balance: number;
  created_at: string;
  updated_at: string;
}

export interface VideoJob {
  id: string;
  user_id: string;
  source_type: "upload" | "youtube" | "tiktok_url" | "generate";
  source_url: string | null;
  storage_path: string | null;
  title: string | null;
  duration_seconds: number | null;
  niche: string | null;
  language: string;
  status: JobStatus;
  progress: number;
  transcript: unknown | null;
  /** What the person asked for — the brief on a clipping job, the prompt on a generate job. */
  clip_prompt: string | null;
  aspect_ratio: string | null;
  /** Only on generate jobs: the shot list the model wrote and the renderer used. */
  scene_plan: unknown | null;
  /** Only on generate jobs: the clips the person attached, so a retry can reuse them. */
  source_asset_paths: string[] | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface Clip {
  id: string;
  job_id: string;
  user_id: string;
  index_in_job: number;
  start_seconds: number;
  end_seconds: number;
  viral_score: number | null;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  aspect_ratio: string;
  duration_seconds: number | null;
  status: ClipStatus;
  render_config: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  external_user_id: string;
  username: string | null;
  display_name: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Publish {
  id: string;
  user_id: string;
  clip_id: string;
  social_account_id: string;
  platform: Platform;
  scheduled_for: string | null;
  published_at: string | null;
  status: PublishStatus;
  external_post_id: string | null;
  external_url: string | null;
  caption: string | null;
  error_message: string | null;
  created_at: string;
}

export interface UsageQuotaView {
  user_id: string;
  tier: SubscriptionTier;
  videos_used: number;
  minutes_processed: number;
  clips_generated: number;
  videos_limit: number;
}

type Insertable<T> = Partial<T>;
type Updatable<T> = Partial<T>;

export type Database = {
  clipforge: {
    Tables: {
      profiles: { Row: Profile; Insert: Insertable<Profile>; Update: Updatable<Profile> };
      video_jobs: { Row: VideoJob; Insert: Insertable<VideoJob>; Update: Updatable<VideoJob> };
      clips: { Row: Clip; Insert: Insertable<Clip>; Update: Updatable<Clip> };
      social_accounts: { Row: SocialAccount; Insert: Insertable<SocialAccount>; Update: Updatable<SocialAccount> };
      publishes: { Row: Publish; Insert: Insertable<Publish>; Update: Updatable<Publish> };
      usage_quotas: {
        Row: { user_id: string; period_start: string; videos_used: number; minutes_processed: number; clips_generated: number };
        Insert: Partial<{ user_id: string; period_start: string; videos_used: number; minutes_processed: number; clips_generated: number }>;
        Update: Partial<{ user_id: string; period_start: string; videos_used: number; minutes_processed: number; clips_generated: number }>;
      };
    };
    Views: {
      v_user_quota: { Row: UsageQuotaView };
    };
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      job_status: JobStatus;
      clip_status: ClipStatus;
      platform: Platform;
      publish_status: PublishStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
