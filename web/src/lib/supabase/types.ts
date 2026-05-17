export type SubscriptionTier = "free" | "starter" | "pro" | "agency";
export type JobStatus = "queued" | "transcribing" | "scoring" | "rendering" | "ready" | "failed";
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
  created_at: string;
  updated_at: string;
}

export interface VideoJob {
  id: string;
  user_id: string;
  source_type: "upload" | "youtube" | "tiktok_url";
  source_url: string | null;
  storage_path: string | null;
  title: string | null;
  duration_seconds: number | null;
  niche: string | null;
  language: string;
  status: JobStatus;
  progress: number;
  transcript: unknown | null;
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

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      video_jobs: { Row: VideoJob; Insert: Partial<VideoJob>; Update: Partial<VideoJob> };
      clips: { Row: Clip; Insert: Partial<Clip>; Update: Partial<Clip> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      job_status: JobStatus;
      clip_status: ClipStatus;
      platform: Platform;
      publish_status: PublishStatus;
    };
  };
};
