-- ============================================================
-- RLS Policies for Reflexa
--
-- The backend uses the service_role key which bypasses RLS.
-- These policies protect direct Supabase client access
-- (e.g. future mobile clients using the anon key) and
-- provide defense-in-depth if the service role is ever
-- replaced or a direct client is introduced.
-- ============================================================

-- SESSIONS TABLE --

-- Users can only SELECT their own sessions
CREATE POLICY "sessions_select_own"
  ON public.sessions
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can INSERT sessions for themselves only
CREATE POLICY "sessions_insert_own"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can UPDATE their own sessions
CREATE POLICY "sessions_update_own"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can DELETE their own sessions
CREATE POLICY "sessions_delete_own"
  ON public.sessions
  FOR DELETE
  USING (auth.uid()::text = user_id);


-- STRATEGIES TABLE --

-- Users can read: global strategies (user_id IS NULL) OR their own
CREATE POLICY "strategies_select_own_or_global"
  ON public.strategies
  FOR SELECT
  USING (user_id IS NULL OR auth.uid()::text = user_id);

-- Users can INSERT their own strategies or global ones (if user_id IS NULL)
CREATE POLICY "strategies_insert_own"
  ON public.strategies
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

-- Users can UPDATE their own strategies
CREATE POLICY "strategies_update_own"
  ON public.strategies
  FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);
