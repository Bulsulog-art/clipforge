import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * DELETE /api/account — permanently delete the authenticated user.
 *
 * App Store Guideline 5.1.1(v) requires apps that let users sign up to also
 * let them initiate account deletion from within the app.
 *
 * What gets deleted:
 *   - auth.users row (cascades to clipforge.profiles via FK on delete cascade)
 *   - Profile cascade removes: video_jobs, clips, publishes, social_accounts,
 *     avatar_jobs, credit_events, push_tokens (all via on delete cascade)
 *   - Storage buckets: clip videos + thumbnails + faces under {userId}/...
 *     are removed best-effort. RevenueCat subscription state is left intact —
 *     Apple receipt is owned by the Apple ID, not the ClipForge account, and
 *     re-installs can restore.
 *
 * The user is signed out by Supabase as part of the delete. iOS app handles
 * the local-state cleanup on its side.
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const userId = user.id;

  // Best-effort: tear down the user's ElevenLabs voice clones BEFORE the
  // DB cascade wipes our pointers. Otherwise the voices linger in our
  // workspace forever — a leaked voiceprint of a user who explicitly
  // asked us to delete their data. GDPR Article 17 + App Store 5.1.1(v).
  if (process.env.ELEVENLABS_API_KEY) {
    const { data: clones } = await svc
      .from("voice_clones")
      .select("elevenlabs_voice_id")
      .eq("user_id", userId);
    const apiKey = process.env.ELEVENLABS_API_KEY;
    await Promise.allSettled(
      (clones ?? []).map((c) =>
        fetch(
          `https://api.elevenlabs.io/v1/voices/${c.elevenlabs_voice_id}`,
          {
            method: "DELETE",
            headers: { "xi-api-key": apiKey },
          },
        ),
      ),
    );
  }

  // Best-effort: remove the user's storage objects. We use list+remove rather
  // than the catch-all "rm -rf {prefix}" because Supabase doesn't support
  // recursive prefix delete in one call.
  const buckets = [
    "clipforge-videos-rendered",
    "clipforge-thumbnails",
    "clipforge-faces",
    "clipforge-uploads",
  ];
  await Promise.allSettled(
    buckets.map(async (bucket) => {
      const { data: files } = await svc.storage.from(bucket).list(userId, { limit: 1000 });
      if (!files?.length) return;
      const paths = files.map((f) => `${userId}/${f.name}`);
      // Drill one level deeper for derivative/thumbnail subfolders
      const subdirs = files.filter((f) => f.id == null);
      for (const sub of subdirs) {
        const { data: nested } = await svc.storage
          .from(bucket)
          .list(`${userId}/${sub.name}`, { limit: 1000 });
        if (nested?.length) {
          paths.push(...nested.map((n) => `${userId}/${sub.name}/${n.name}`));
        }
      }
      if (paths.length > 0) {
        await svc.storage.from(bucket).remove(paths);
      }
    }),
  );

  // Delete the auth user. Supabase cascades the deletion through the FK on
  // clipforge.profiles → which itself cascades through every child table.
  const { error: delErr } = await svc.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json(
      { error: `Account deletion failed: ${delErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ deleted: true });
}
