/**
 * Delete storage left by DentVideo accounts that never paid (audit H4):
 * objects older than 30 days in the folders of trial / clinic-less accounts
 * (their current logo is kept) and of accounts that no longer exist. Paying,
 * paused and cancelled clinics are never touched. Logic and tests:
 * web/src/lib/dentvid/storage-cleanup.ts.
 *
 *   cd web
 *   NEXT_PUBLIC_DENTVID_SUPABASE_URL=https://liman.bulsulabs.com \
 *   DENTVID_SERVICE_ROLE_KEY=… \
 *   ../worker/node_modules/.bin/tsx ../scripts/dentvideo-storage-cleanup.mts               # dry run
 *   … ../scripts/dentvideo-storage-cleanup.mts --apply                                      # delete
 *   … ../scripts/dentvideo-storage-cleanup.mts --apply --days=45                            # older than 45 days
 *
 * Deletes through the Storage API (deleting rows in storage.objects would
 * leave the files on disk). Safe to schedule weekly (e.g. a Coolify cron).
 */
// Dynamic imports: web/ is CommonJS to tsx, and static named imports from it fail.
const { dvAdmin } = await import("../web/src/lib/dentvid/supabase");
const { CLEANUP_MIN_AGE_DAYS, runStorageCleanup } = await import("../web/src/lib/dentvid/storage-cleanup");

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const daysArg = argv.find((a) => a.startsWith("--days="));
const minAgeDays = daysArg ? Math.max(CLEANUP_MIN_AGE_DAYS, Number(daysArg.slice(7)) || CLEANUP_MIN_AGE_DAYS) : CLEANUP_MIN_AGE_DAYS;

await runStorageCleanup({ db: dvAdmin(), apply, minAgeDays });
if (!apply) console.log("Dry run only. Re-run with --apply to delete.");
