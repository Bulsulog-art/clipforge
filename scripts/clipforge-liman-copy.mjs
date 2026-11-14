#!/usr/bin/env node
// Copy ClipForge's data from the cloud Supabase project to Liman (self-hosted).
//
// Run at cut-over, after supabase/liman/0017_clipforge_schema.sql, with the
// web app and the worker stopped so nothing writes to the cloud meanwhile:
//
//   node scripts/clipforge-liman-copy.mjs db --dry-run   # stage + check, rolls back
//   node scripts/clipforge-liman-copy.mjs db             # stage + copy (one transaction)
//   node scripts/clipforge-liman-copy.mjs storage        # copy bucket objects
//   node scripts/clipforge-liman-copy.mjs verify         # row + object counts, cloud vs Liman
//   node scripts/clipforge-liman-copy.mjs cleanup        # drop the staging schema
//   node scripts/clipforge-liman-copy.mjs selftest       # synthetic data through `db`, rolled back
//
// Environment:
//   SUPABASE_ACCESS_TOKEN   personal access token (supabase.com → Account → Access tokens);
//                           reads the cloud database through the Management API
//   CLOUD_PROJECT_REF       default rgtxjjnalesquhnexfez
//   LIMAN_PG_META_URL       default https://liman.bulsulabs.com/api/platform/pg-meta/default/query
//   storage / verify also:  CLOUD_SUPABASE_URL, CLOUD_SERVICE_ROLE_KEY,
//                           LIMAN_SUPABASE_URL, LIMAN_SERVICE_ROLE_KEY
//
// What `db` does:
//   1. Reads every clipforge.* table, plus the auth.users / auth.identities
//      rows of users who have a clipforge.profiles row, from the cloud.
//   2. Stages them as jsonb in clipforge_stage.rows on Liman.
//   3. In ONE transaction on Liman:
//      - auth users, matched by email (lower-case):
//          * already on Liman (another app's account): merged. The ClipForge
//            data is attached to the Liman id; the Liman password and
//            identities stay; "clipforge" is added to app_metadata
//            (product, or the products list when another product is set).
//            Refused (whole run aborts) unless both sides confirmed the email.
//          * not on Liman: the cloud row is inserted with the same id,
//            password hash and identities, app_metadata marked "clipforge".
//      - truncates the clipforge tables and loads them, rewriting merged
//        users' cloud ids to their Liman ids (ids also appear inside storage
//        paths, so the rewrite covers every column);
//      - resets the bigint sequences;
//      - checks each table's count against what was staged.
//      The id map stays in clipforge_stage.id_map for `storage`.
//   Liman's own auth.users trigger (Studio's public.handle_new_user) fires
//   for inserted users, as it does for every Liman sign-up.

const CLOUD_REF = process.env.CLOUD_PROJECT_REF || "rgtxjjnalesquhnexfez";
const PG_META = process.env.LIMAN_PG_META_URL || "https://liman.bulsulabs.com/api/platform/pg-meta/default/query";

// Insert order respects the foreign keys.
export const TABLES = [
  "profiles", "music_tracks", "avatars", "feature_flags", "announcements",
  "video_jobs", "clips", "clip_derivatives", "voice_clones", "avatar_jobs",
  "social_accounts", "publishes", "analytics_snapshots", "brand_kits", "clip_branding",
  "clinics", "dental_items", "credit_events", "app_events", "feedback",
  "push_tokens", "referral_codes", "referrals", "trend_snapshots", "usage_quotas",
];
const SEQUENCES = { analytics_snapshots: "analytics_snapshots_id_seq", trend_snapshots: "trend_snapshots_id_seq" };
const CHUNK_BYTES = 400_000;

// ---------- transport ----------

async function cloudQuery(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not set");
  const r = await fetch(`https://api.supabase.com/v1/projects/${CLOUD_REF}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: true }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`cloud query failed (${r.status}): ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function limanQuery(sql) {
  const r = await fetch(PG_META, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Liman query failed (${r.status}): ${text.slice(0, 800)}`);
  return JSON.parse(text);
}

// ---------- SQL builders (pure; exported for the self-test) ----------

/** A dollar-quoted literal whose tag cannot occur in the text. */
export function dollar(text) {
  let tag = "cf";
  while (text.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${text}$${tag}$`;
}

export function stageSetupSql() {
  return `create schema if not exists clipforge_stage;
revoke all on schema clipforge_stage from public, anon, authenticated;
create table if not exists clipforge_stage.rows (tbl text not null, data jsonb not null);
create table if not exists clipforge_stage.id_map (cloud_id uuid primary key, liman_id uuid not null, merged boolean not null);
truncate clipforge_stage.rows;`;
}

/** Split rows into INSERT statements of at most ~CHUNK_BYTES each. */
export function stageInsertSql(tbl, rows) {
  const out = [];
  let cur = [];
  let size = 0;
  const flush = () => {
    if (!cur.length) return;
    const json = JSON.stringify(cur);
    out.push(`insert into clipforge_stage.rows (tbl, data) select ${dollar(tbl)}, x from jsonb_array_elements(${dollar(json)}::jsonb) x;`);
    cur = [];
    size = 0;
  };
  for (const row of rows) {
    const n = JSON.stringify(row).length;
    if (size + n > CHUNK_BYTES) flush();
    cur.push(row);
    size += n;
  }
  flush();
  return out;
}

/** The single-transaction copy. Ends with commit, or rollback when dryRun. */
export function finalizeSql({ dryRun }) {
  const loads = TABLES.map((t) => `
  insert into clipforge.${t}
    select (jsonb_populate_record(null::clipforge.${t}, pg_temp.cf_remap(s.data))).*
      from clipforge_stage.rows s where s.tbl = 'clipforge.${t}';`).join("");
  const counts = TABLES.map((t) => `
  insert into pg_temp.cf_summary
    select 'clipforge.${t}', (select count(*) from clipforge_stage.rows where tbl = 'clipforge.${t}'), (select count(*) from clipforge.${t});`).join("");
  const seqs = Object.entries(SEQUENCES).map(([t, s]) => `
  select setval('clipforge.${s}', coalesce((select max(id) from clipforge.${t}), 1), (select max(id) from clipforge.${t}) is not null);`).join("");
  return `begin;
create temp table cf_summary (item text, staged bigint, loaded bigint) on commit drop;

-- app_metadata with "clipforge" added: as product when none is set, else to products.
create function pg_temp.cf_mark(app jsonb) returns jsonb language sql immutable as $f$
  select case
    when coalesce(app->>'product', '') = '' then coalesce(app, '{}'::jsonb) || '{"product":"clipforge"}'::jsonb
    when app->>'product' = 'clipforge' or coalesce(app->'products', '[]'::jsonb) ? 'clipforge' then app
    when jsonb_typeof(app->'products') = 'array' then jsonb_set(app, '{products}', (app->'products') || '["clipforge"]'::jsonb)
    else app || '{"products":["clipforge"]}'::jsonb
  end
$f$;

-- Rewrite merged users' cloud ids to their Liman ids anywhere in a row.
create function pg_temp.cf_remap(d jsonb) returns jsonb language plpgsql stable as $f$
declare m record; t text := d::text;
begin
  for m in select cloud_id, liman_id from clipforge_stage.id_map where merged and cloud_id <> liman_id loop
    t := replace(t, m.cloud_id::text, m.liman_id::text);
  end loop;
  return t::jsonb;
end
$f$;

do $f$
declare
  r record;
  cid uuid;
  lid uuid;
  lconf timestamptz;
  ucols text;
  icols text;
  n_new int := 0;
  n_merged int := 0;
  n_ident int := 0;
begin
  truncate clipforge_stage.id_map;

  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into ucols
    from information_schema.columns
   where table_schema = 'auth' and table_name = 'users' and is_generated = 'NEVER'
     and column_name in (select jsonb_object_keys(s.data) from (select data from clipforge_stage.rows where tbl = 'auth.users' limit 1) s);
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into icols
    from information_schema.columns
   where table_schema = 'auth' and table_name = 'identities' and is_generated = 'NEVER'
     and column_name in (select jsonb_object_keys(s.data) from (select data from clipforge_stage.rows where tbl = 'auth.identities' limit 1) s);

  for r in select data from clipforge_stage.rows where tbl = 'auth.users' loop
    cid := (r.data->>'id')::uuid;
    if coalesce(r.data->>'email', '') = '' then
      raise exception 'cloud user % has no email; cannot match it on Liman', cid;
    end if;
    select u.id, u.email_confirmed_at into lid, lconf
      from auth.users u where lower(u.email) = lower(r.data->>'email');
    if lid is not null then
      if lid <> cid and (lconf is null or (r.data->>'email_confirmed_at') is null) then
        raise exception 'merge refused: cloud user % matches Liman user % by email, but an address is unconfirmed on one side', cid, lid;
      end if;
      insert into clipforge_stage.id_map values (cid, lid, true);
      update auth.users set raw_app_meta_data = pg_temp.cf_mark(raw_app_meta_data) where id = lid;
      n_merged := n_merged + 1;
    else
      if exists (select 1 from auth.users where id = cid) then
        raise exception 'id collision: cloud user % has the id of a Liman user with another email', cid;
      end if;
      insert into clipforge_stage.id_map values (cid, cid, false);
      execute format('insert into auth.users (%s) select %s from jsonb_populate_record(null::auth.users, $1)', ucols, ucols)
        using jsonb_set(r.data, '{raw_app_meta_data}', pg_temp.cf_mark(coalesce(r.data->'raw_app_meta_data', '{}'::jsonb)));
      n_new := n_new + 1;
    end if;
  end loop;

  -- Identities only for users created here; a merged account keeps its own.
  for r in
    select s.data from clipforge_stage.rows s
      join clipforge_stage.id_map m on m.cloud_id = (s.data->>'user_id')::uuid and not m.merged
     where s.tbl = 'auth.identities'
  loop
    if exists (select 1 from auth.identities i where i.provider = r.data->>'provider' and i.provider_id = r.data->>'provider_id') then
      raise exception 'identity collision: % identity of cloud user % already exists on Liman', r.data->>'provider', r.data->>'user_id';
    end if;
    execute format('insert into auth.identities (%s) select %s from jsonb_populate_record(null::auth.identities, $1)', icols, icols)
      using r.data;
    n_ident := n_ident + 1;
  end loop;

  insert into pg_temp.cf_summary values
    ('auth.users', (select count(*) from clipforge_stage.rows where tbl = 'auth.users'), n_new + n_merged),
    ('auth.users new', null, n_new),
    ('auth.users merged', null, n_merged),
    ('auth.identities', (select count(*) from clipforge_stage.rows s join clipforge_stage.id_map m on m.cloud_id = (s.data->>'user_id')::uuid and not m.merged where s.tbl = 'auth.identities'), n_ident);
end
$f$;

truncate ${TABLES.map((t) => `clipforge.${t}`).join(", ")};
${loads}
${seqs}
${counts}

do $f$
declare bad text;
begin
  select string_agg(item || ' staged ' || staged || ' loaded ' || loaded, '; ') into bad
    from pg_temp.cf_summary where staged is not null and staged <> loaded;
  if bad is not null then raise exception 'count mismatch: %', bad; end if;
end
$f$;

select json_agg(row_to_json(s)) as summary from pg_temp.cf_summary s;
${dryRun ? "rollback;" : "commit;"}`;
}

// ---------- commands ----------

async function exportCloud() {
  const out = {};
  const pageSize = 200;
  for (const t of TABLES) {
    const rows = [];
    for (let off = 0; ; off += pageSize) {
      const page = await cloudQuery(`select to_jsonb(x) as r from clipforge.${t} x order by 1 offset ${off} limit ${pageSize}`);
      rows.push(...page.map((p) => p.r));
      if (page.length < pageSize) break;
    }
    out[`clipforge.${t}`] = rows;
    console.log(`cloud clipforge.${t}: ${rows.length}`);
  }
  out["auth.users"] = (await cloudQuery(
    "select to_jsonb(u) as r from auth.users u where exists (select 1 from clipforge.profiles p where p.id = u.id) order by u.id",
  )).map((p) => p.r);
  out["auth.identities"] = (await cloudQuery(
    "select to_jsonb(i) as r from auth.identities i where exists (select 1 from clipforge.profiles p where p.id = i.user_id) order by i.user_id, i.provider",
  )).map((p) => p.r);
  console.log(`cloud auth.users: ${out["auth.users"].length}, auth.identities: ${out["auth.identities"].length}`);
  return out;
}

async function stage(data) {
  await limanQuery(stageSetupSql());
  for (const [tbl, rows] of Object.entries(data)) {
    for (const sql of stageInsertSql(tbl, rows)) await limanQuery(sql);
  }
}

async function db({ dryRun }) {
  const data = await exportCloud();
  await stage(data);
  const res = await limanQuery(finalizeSql({ dryRun }));
  console.log(dryRun ? "DRY RUN (rolled back):" : "COPIED:");
  console.table(res[0]?.summary ?? res);
}

async function storage() {
  const need = ["CLOUD_SUPABASE_URL", "CLOUD_SERVICE_ROLE_KEY", "LIMAN_SUPABASE_URL", "LIMAN_SERVICE_ROLE_KEY"];
  for (const k of need) if (!process.env[k]) throw new Error(`${k} is not set`);
  const map = await limanQuery("select cloud_id::text c, liman_id::text l from clipforge_stage.id_map where merged and cloud_id <> liman_id");
  const rename = (name) => map.reduce((s, m) => s.split(m.c).join(m.l), name);
  const objects = await cloudQuery(
    "select bucket_id, name, metadata->>'mimetype' as mime, (metadata->>'size')::bigint as size from storage.objects where bucket_id like 'clipforge-%' order by bucket_id, name",
  );
  const cloudH = { authorization: `Bearer ${process.env.CLOUD_SERVICE_ROLE_KEY}`, apikey: process.env.CLOUD_SERVICE_ROLE_KEY };
  const limanH = { authorization: `Bearer ${process.env.LIMAN_SERVICE_ROLE_KEY}`, apikey: process.env.LIMAN_SERVICE_ROLE_KEY };
  const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
  let ok = 0;
  const failed = [];
  for (const o of objects) {
    const src = `${process.env.CLOUD_SUPABASE_URL}/storage/v1/object/${o.bucket_id}/${enc(o.name)}`;
    const dst = `${process.env.LIMAN_SUPABASE_URL}/storage/v1/object/${o.bucket_id}/${enc(rename(o.name))}`;
    const get = await fetch(src, { headers: cloudH });
    if (!get.ok) { failed.push(`${o.bucket_id}/${o.name}: download ${get.status}`); continue; }
    const body = Buffer.from(await get.arrayBuffer());
    const put = await fetch(dst, {
      method: "POST",
      headers: { ...limanH, "content-type": o.mime || "application/octet-stream", "x-upsert": "true" },
      body,
    });
    if (!put.ok) { failed.push(`${o.bucket_id}/${o.name}: upload ${put.status} ${(await put.text()).slice(0, 200)}`); continue; }
    ok += 1;
  }
  console.log(`storage: ${ok}/${objects.length} objects copied`);
  if (failed.length) { console.log(failed.join("\n")); process.exitCode = 1; }
}

async function verify() {
  const tables = TABLES.map((t) => `select 'clipforge.${t}' as item, count(*)::bigint as n from clipforge.${t}`).join(" union all ");
  const objs = "select 'storage ' || bucket_id as item, count(*)::bigint as n from storage.objects where bucket_id like 'clipforge-%' group by bucket_id";
  const cloud = await cloudQuery(`${tables} union all ${objs} union all select 'auth.users (clipforge)', count(*) from auth.users u where exists (select 1 from clipforge.profiles p where p.id = u.id)`);
  const liman = await limanQuery(`${tables} union all ${objs} union all select 'auth.users (clipforge)', count(*) from auth.users u where exists (select 1 from clipforge.profiles p where p.id = u.id)`);
  const l = Object.fromEntries(liman.map((r) => [r.item, Number(r.n)]));
  let bad = 0;
  const rows = cloud.map((r) => {
    const c = Number(r.n);
    const m = l[r.item] ?? 0;
    if (c !== m) bad += 1;
    return { item: r.item, cloud: c, liman: m, ok: c === m };
  });
  console.table(rows);
  if (bad) { console.log(`${bad} mismatches`); process.exitCode = 1; }
}

// Synthetic rows through the same staging + finalize SQL, in ONE request that
// rolls back: proves the SQL against Liman's real schema without writing.
async function selftest() {
  const uid = "00000000-0000-4000-8000-00000000c1f0";
  const jid = "00000000-0000-4000-8000-00000000c1f1";
  const now = new Date().toISOString();
  const data = {
    "auth.users": [{
      instance_id: "00000000-0000-0000-0000-000000000000", id: uid, aud: "authenticated", role: "authenticated",
      email: "clipforge-selftest@invalid.example", encrypted_password: "", email_confirmed_at: now,
      raw_app_meta_data: { provider: "apple", providers: ["apple"] }, raw_user_meta_data: {},
      created_at: now, updated_at: now, is_sso_user: false, is_anonymous: false, confirmed_at: now,
    }],
    "auth.identities": [{
      provider_id: "selftest-apple-sub", user_id: uid, identity_data: { sub: "selftest-apple-sub", email: "clipforge-selftest@invalid.example" },
      provider: "apple", last_sign_in_at: now, created_at: now, updated_at: now, email: "clipforge-selftest@invalid.example",
      id: "00000000-0000-4000-8000-00000000c1f2",
    }],
    "clipforge.profiles": [{ id: uid, email: "clipforge-selftest@invalid.example", credits_balance: 1, push_preferences: {}, tier: "free", watermark_enabled: true, created_at: now, updated_at: now, credits_lifetime_purchased: 0, credits_lifetime_consumed: 0 }],
    "clipforge.video_jobs": [{ id: jid, user_id: uid, source_type: "upload", status: "ready", progress: 100, created_at: now, bg_music_enabled: true, storage_path: `${uid}/raw.mp4` }],
    "clipforge.clips": [{ id: "00000000-0000-4000-8000-00000000c1f3", job_id: jid, user_id: uid, index_in_job: 0, start_seconds: 0, end_seconds: 10, aspect_ratio: "9:16", status: "ready", created_at: now, updated_at: now, source_kind: "pipeline", is_favorite: false, hashtags: ["a", "b"] }],
    "clipforge.credit_events": [{ id: "00000000-0000-4000-8000-00000000c1f4", user_id: uid, kind: "consume", amount: -1, balance_after: 0, created_at: now }],
    "clipforge.trend_snapshots": [{ id: 41, niche: "fitness", generated_at: now, source: "gpt", items: [{ t: "x" }] }],
  };
  const stmts = [stageSetupSql()];
  for (const [tbl, rows] of Object.entries(data)) stmts.push(...stageInsertSql(tbl, rows));
  // Merge case: a cloud user whose address belongs to an existing, confirmed
  // Liman account of another product. Built in SQL so no address leaves Liman.
  const mid = "00000000-0000-4000-8000-00000000c1f5";
  stmts.push(`create temp table cf_t on commit drop as
    select id, email from auth.users where email_confirmed_at is not null and coalesce(raw_app_meta_data->>'product', '') not in ('', 'clipforge') limit 1;
  insert into clipforge_stage.rows select 'auth.users', jsonb_build_object('id', '${mid}', 'email', upper(email), 'email_confirmed_at', '${now}', 'aud', 'authenticated', 'role', 'authenticated', 'raw_app_meta_data', '{"provider":"email","providers":["email"]}'::jsonb) from cf_t;
  insert into clipforge_stage.rows select 'auth.identities', jsonb_build_object('id', gen_random_uuid(), 'user_id', '${mid}', 'provider', 'email', 'provider_id', '${mid}', 'identity_data', '{}'::jsonb) from cf_t;
  insert into clipforge_stage.rows select 'clipforge.profiles', jsonb_build_object('id', '${mid}', 'email', email, 'credits_balance', 7, 'tier', 'free', 'watermark_enabled', true, 'created_at', now(), 'updated_at', now(), 'credits_lifetime_purchased', 0, 'credits_lifetime_consumed', 0, 'push_preferences', '{}'::jsonb) from cf_t;
  insert into clipforge_stage.rows select 'clipforge.video_jobs', jsonb_build_object('id', gen_random_uuid(), 'user_id', '${mid}', 'source_type', 'upload', 'storage_path', '${mid}/raw.mp4', 'status', 'ready', 'progress', 100, 'created_at', now(), 'bg_music_enabled', true) from cf_t;`);
  const fin = finalizeSql({ dryRun: true }).replace(/^begin;/, "");
  const check = `select json_build_object(
    'summary', (select json_agg(row_to_json(s)) from pg_temp.cf_summary s where loaded > 0),
    'marker', (select raw_app_meta_data from auth.users where id = '${uid}'),
    'identity', (select count(*) from auth.identities where user_id = '${uid}'),
    'trend_seq', (select last_value from clipforge.trend_snapshots_id_seq),
    'merge_target_found', (select count(*) from cf_t),
    'merged_profile_on_liman_id', (select count(*) from clipforge.profiles p join cf_t on p.id = cf_t.id and p.credits_balance = 7),
    'merged_job_path_remapped', (select count(*) from clipforge.video_jobs j join cf_t on j.user_id = cf_t.id and j.storage_path = cf_t.id || '/raw.mp4'),
    'merged_marker', (select raw_app_meta_data - 'provider' - 'providers' from auth.users u join cf_t on u.id = cf_t.id),
    'merged_no_new_user', (select count(*) = 0 from auth.users where id = '${mid}'),
    'merged_no_identity_copied', (select count(*) = 0 from auth.identities where provider_id = '${mid}')) as result;`;
  const sql = "begin;\n" + stmts.join("\n") + "\n" + fin.replace(/select json_agg\(row_to_json\(s\)\) as summary from pg_temp\.cf_summary s;\s*rollback;\s*$/, check + "\nrollback;");
  const res = await limanQuery(sql);
  console.log(JSON.stringify(res, null, 2));
}

const cmd = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const run = { db: () => db({ dryRun }), storage, verify, selftest, cleanup: () => limanQuery("drop schema if exists clipforge_stage cascade").then(() => console.log("staging dropped")) }[cmd];
if (!run) {
  console.error("usage: clipforge-liman-copy.mjs db [--dry-run] | storage | verify | cleanup | selftest");
  process.exit(2);
}
run().catch((e) => { console.error(e.message); process.exit(1); });
