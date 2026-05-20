// Shared shape for publisher inputs. Matches the columns we actually `select *`
// from `social_accounts` + `clips`. Keep this in sync with migrations 00001
// (clips, social_accounts) and 00003+ (translated/face-swap derivatives).

export type PublisherAccount = {
  id: string;
  user_id: string;
  platform?: string;
  external_user_id: string;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  meta?: { open_id?: string } | null;
};

export type PublisherClip = {
  id: string;
  user_id: string;
  storage_path: string;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
};
