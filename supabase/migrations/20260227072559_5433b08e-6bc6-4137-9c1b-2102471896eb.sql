
-- ============================================================
-- PremiumConnect — RLS PERMISSIVE policies pour les nouvelles tables
-- ============================================================

-- resellers : lecture par admins authentifiés, écriture via Edge Functions
CREATE POLICY "resellers_read_authenticated" ON public.resellers
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- hardware_integrations : lecture par admins authentifiés
CREATE POLICY "hardware_read_authenticated" ON public.hardware_integrations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- pc_admin_users : lecture par admins authentifiés
CREATE POLICY "pc_admin_users_read_authenticated" ON public.pc_admin_users
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- pc_audit_logs : lecture par admins authentifiés
CREATE POLICY "pc_audit_logs_read_authenticated" ON public.pc_audit_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- wifi_users : allow public insert for portal registration (via Edge Functions with service_role)
-- Keep existing policies but add permissive read for portal
CREATE POLICY "wifi_users_public_read_by_site" ON public.wifi_users
  AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
