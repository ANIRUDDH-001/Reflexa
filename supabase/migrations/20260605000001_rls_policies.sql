-- ============================================================
-- RLS Policies for Reflexa
-- Backend uses service_role (bypasses RLS).
-- These policies protect direct client access as defense-in-depth.
-- ============================================================

-- SESSIONS: users can only see/modify their own sessions
CREATE POLICY "sessions_select_own"
  ON public.sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "sessions_insert_own"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "sessions_update_own"
  ON public.sessions FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "sessions_delete_own"
  ON public.sessions FOR DELETE
  USING (auth.uid()::text = user_id);

-- STRATEGIES: users can read global strategies (user_id IS NULL) or their own
CREATE POLICY "strategies_select_own_or_global"
  ON public.strategies FOR SELECT
  USING (user_id IS NULL OR auth.uid()::text = user_id);

CREATE POLICY "strategies_insert_own"
  ON public.strategies FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "strategies_update_own"
  ON public.strategies FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);
