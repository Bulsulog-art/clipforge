/**
 * One-off backfill for audit H2: copy the DentVideo marker (and the
 * email-verified flag) from user_metadata (user-editable) to app_metadata
 * (service role only). Logic and tests: web/src/lib/dentvid/backfill.ts.
 *
 * Run against Liman BEFORE (or right after) deploying the app_metadata
 * change — it is additive, the old code ignores app_metadata — and BEFORE
 * applying supabase/liman/0008_dentvid_storage.sql, whose RLS admits only
 * accounts with app_metadata.product = "dentvideo".
 *
 *   cd web
 *   NEXT_PUBLIC_DENTVID_SUPABASE_URL=https://liman.bulsulabs.com \
 *   DENTVID_SERVICE_ROLE_KEY=… \
 *   ../worker/node_modules/.bin/tsx ../scripts/dentvideo-backfill-app-metadata.mts            # dry run
 *   … ../scripts/dentvideo-backfill-app-metadata.mts --apply                                   # write
 *   … ../scripts/dentvideo-backfill-app-metadata.mts --apply --no-verified                     # marker only
 *
 * Idempotent: a second run finds nothing to do. Run from web/ so its
 * tsconfig paths and node_modules resolve.
 */
// Dynamic imports: web/ is CommonJS to tsx, and static named imports from it fail.
const { dvAdmin } = await import("../web/src/lib/dentvid/supabase");
const { runBackfill } = await import("../web/src/lib/dentvid/backfill");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const copyVerified = !args.has("--no-verified");

const res = await runBackfill({ db: dvAdmin(), apply, copyVerified });
if (!apply) console.log("Dry run only. Re-run with --apply to write.");
if (res.unmarkedClinicOwners.length) process.exitCode = 2;
