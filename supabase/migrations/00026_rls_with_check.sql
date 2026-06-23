-- ============================================================
-- ClipForge — add WITH CHECK to the per-user "self all" RLS policies
--
-- These tables had `FOR ALL USING (auth.uid() = user_id)` with NO WITH CHECK.
-- Postgres evaluates WITH CHECK (not USING) on INSERT and on the NEW row of an
-- UPDATE, so an authenticated anon-key client could INSERT or reassign a row to
-- a DIFFERENT user_id (cross-tenant IDOR) — e.g. attach a connected channel or
-- a publish to another account. Service-role writes (worker / API routes)
-- bypass RLS and are unaffected.
--
-- ALTER POLICY ... WITH CHECK keeps the existing USING clause intact.
-- ============================================================

alter policy "brand self all"      on clipforge.brand_kits       with check (auth.uid() = user_id);
alter policy "derivative self all" on clipforge.clip_derivatives with check (auth.uid() = user_id);
alter policy "publish self all"    on clipforge.publishes        with check (auth.uid() = user_id);
alter policy "push self all"       on clipforge.push_tokens      with check (auth.uid() = user_id);
alter policy "social self all"     on clipforge.social_accounts  with check (auth.uid() = user_id);
