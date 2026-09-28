-- ============================================================================
-- RLS POLICIES FOR MULTI-TENANT ISOLATION
-- ============================================================================
-- Enable RLS on core tables and create policies scoped by role:
--   super_admin : full access
--   reseller    : access to own reseller's sites and related data
--   site_manager: access to assigned site(s) only
--   viewer      : read-only access to assigned site(s)
-- ============================================================================

-- Ensure required helper functions exist (they should be created by 20260917090100_multi_tenant_rbac.sql)
-- If not, this migration will fail; apply that migration first.

-- --------------------------------------------------------------------------
-- 1. SITES TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "public_read_active_sites" ON public.sites;
DROP POLICY IF EXISTS "sites_super_admin_all" ON public.sites;
DROP POLICY IF EXISTS "sites_reseller_manage_own" ON public.sites;
DROP POLICY IF EXISTS "sites_site_manager_read_own" ON public.sites;
DROP POLICY IF EXISTS "sites_viewer_read_own" ON public.sites;

-- Select: anyone who can access the site (per can_access_site)
CREATE POLICY "sites_select_scoped"
  ON public.sites FOR SELECT
  TO authenticated
  USING (public.can_access_site(id));

-- Insert: super_admin or reseller creating a site under their own reseller_id
CREATE POLICY "sites_insert_scoped"
  ON public.sites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.is_reseller_of(NEW.reseller_id)
  );

-- Update: super_admin or reseller updating a site under their own reseller_id
CREATE POLICY "sites_update_scoped"
  ON public.sites FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of((SELECT reseller_id FROM public.sites WHERE id = id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_reseller_of(NEW.reseller_id)
  );

-- Delete: super_admin or reseller deleting a site under their own reseller_id
CREATE POLICY "sites_delete_scoped"
  ON public.sites FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of((SELECT reseller_id FROM public.sites WHERE id = id))
  );

-- --------------------------------------------------------------------------
-- 2. RESELLERS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resellers_super_admin_all" ON public.resellers;
DROP POLICY IF EXISTS "resellers_reseller_manage_own" ON public.resellers;
DROP POLICY IF EXISTS "resellers_site_manager_read_own" ON public.resellers;
DROP POLICY IF EXISTS "resellers_viewer_read_own" ON public.resellers;

-- Select: super_admin can see all resellers; reseller can see own; site_manager/viewer cannot see resellers (unless assigned? they shouldn't)
CREATE POLICY "resellers_select_scoped"
  ON public.resellers FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of(id)
  );

-- Insert: super_admin only (resellers are created via onboarding, not by resellers themselves)
CREATE POLICY "resellers_insert_scoped"
  ON public.resellers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Update: super_admin or reseller updating own reseller
CREATE POLICY "resellers_update_scoped"
  ON public.resellers FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of(id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_reseller_of(NEW.id)
  );

-- Delete: super_admin only
CREATE POLICY "resellers_delete_scoped"
  ON public.resellers FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- --------------------------------------------------------------------------
-- 3. HARDWARE_INTEGRATIONS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.hardware_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hardware_integrations_super_admin_all" ON public.hardware_integrations;
DROP POLICY IF EXISTS "hardware_integrations_reseller_manage_own" ON public.hardware_integrations;
DROP POLICY IF EXISTS "hardware_integrations_site_manager_read_own" ON public.hardware_integrations;
DROP POLICY IF EXISTS "hardware_integrations_viewer_read_own" ON public.hardware_integrations;

-- Scope via site_id: user can access hardware integrations for sites they can access
CREATE POLICY "hardware_integrations_select_scoped"
  ON public.hardware_integrations FOR SELECT
  TO authenticated
  USING (public.can_access_site(site_id));

CREATE POLICY "hardware_integrations_insert_scoped"
  ON public.hardware_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.is_reseller_of(
      (SELECT reseller_id FROM public.sites WHERE id = NEW.site_id)
    )
  );

CREATE POLICY "hardware_integrations_update_scoped"
  ON public.hardware_integrations FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of(
      (SELECT reseller_id FROM public.sites WHERE id = site_id)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_reseller_of(
      (SELECT reseller_id FROM public.sites WHERE id = NEW.site_id)
    )
  );

CREATE POLICY "hardware_integrations_delete_scoped"
  ON public.hardware_integrations FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of(
      (SELECT reseller_id FROM public.sites WHERE id = site_id)
    )
  );

-- --------------------------------------------------------------------------
-- 4. WIFI_USERS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.wifi_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wifi_users_super_admin_all" ON public.wifi_users;
DROP POLICY IF EXISTS "wifi_users_reseller_manage_own" ON public.wifi_users;
DROP POLICY IF EXISTS "wifi_users_site_manager_read_own" ON public.wifi_users;
DROP POLICY IF EXISTS "wifi_users_viewer_read_own" ON public.wifi_users;
DROP POLICY IF EXISTS "wifi_users_own_profile_only" ON public.wifi_users;
DROP POLICY IF EXISTS "wifi_users_own_profile_update" ON public.wifi_users;

-- Select: own profile or can_access_site(site_id)
CREATE POLICY "wifi_users_select_scoped"
  ON public.wifi_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.can_access_site(site_id));

-- Write: can_access_site and not viewer
CREATE POLICY "wifi_users_write_scoped"
  ON public.wifi_users FOR ALL
  TO authenticated
  USING (public.can_access_site(site_id) AND NOT public.is_viewer())
  WITH CHECK (public.can_access_site(site_id) AND NOT public.is_viewer());

-- --------------------------------------------------------------------------
-- 5. WIFI_SESSIONS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.wifi_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wifi_sessions_super_admin_all" ON public.wifi_sessions;
DROP POLICY IF EXISTS "wifi_sessions_reseller_manage_own" ON public.wifi_sessions;
DROP POLICY IF EXISTS "wifi_sessions_site_manager_read_own" ON public.wifi_sessions;
DROP POLICY IF EXISTS "wifi_sessions_viewer_read_own" ON public.wifi_sessions;
DROP POLICY IF EXISTS "wifi_sessions_user_update_own" ON public.wifi_sessions;
DROP POLICY IF EXISTS "wifi_sessions_user_create_own" ON public.wifi_sessions;

-- Select: own session or can_access_site(site_id)
CREATE POLICY "wifi_sessions_select_scoped"
  ON public.wifi_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.can_access_site(site_id));

-- Write: can_access_site and not viewer
CREATE POLICY "wifi_sessions_write_scoped"
  ON public.wifi_sessions FOR ALL
  TO authenticated
  USING (public.can_access_site(site_id) AND NOT public.is_viewer())
  WITH CHECK (public.can_access_site(site_id) AND NOT public.is_viewer());

-- --------------------------------------------------------------------------
-- 6. TRANSACTIONS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_super_admin_all" ON public.transactions;
DROP POLICY IF EXISTS "transactions_reseller_manage_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_site_manager_read_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_viewer_read_own" ON public.transactions;

-- Select: own transaction or can_access_site(site_id)
CREATE POLICY "transactions_select_scoped"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.can_access_site(site_id));

-- Write: can_access_site and not viewer
CREATE POLICY "transactions_write_scoped"
  ON public.transactions FOR ALL
  TO authenticated
  USING (public.can_access_site(site_id) AND NOT public.is_viewer())
  WITH CHECK (public.can_access_site(site_id) AND NOT public.is_viewer());

-- --------------------------------------------------------------------------
-- 7. VOUCHERS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vouchers_super_admin_all" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_reseller_manage_own" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_site_manager_read_own" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_viewer_read_own" ON public.vouchers;

-- Select: own voucher or can_access_site(site_id)
CREATE POLICY "vouchers_select_scoped"
  ON public.vouchers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.can_access_site(site_id));

-- Write: can_access_site and not viewer
CREATE POLICY "vouchers_write_scoped"
  ON public.vouchers FOR ALL
  TO authenticated
  USING (public.can_access_site(site_id) AND NOT public.is_viewer())
  WITH CHECK (public.can_access_site(site_id) AND NOT public.is_viewer());

-- --------------------------------------------------------------------------
-- 8. WIFI_PLANS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.wifi_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wifi_plans_super_admin_all" ON public.wifi_plans;
DROP POLICY IF EXISTS "wifi_plans_reseller_manage_own" ON public.wifi_plans;
DROP POLICY IF EXISTS "wifi_plans_site_manager_read_own" ON public.wifi_plans;
DROP POLICY IF EXISTS "wifi_plans_viewer_read_own" ON public.wifi_plans;

-- Select: can_access_site(site_id)
CREATE POLICY "wifi_plans_select_scoped"
  ON public.wifi_plans FOR SELECT
  TO authenticated
  USING (public.can_access_site(site_id));

-- Write: super_admin or reseller (site_manager/viewer cannot create plans)
CREATE POLICY "wifi_plans_write_scoped"
  ON public.wifi_plans FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_reseller_of(site_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_reseller_of(NEW.site_id)
  );

-- --------------------------------------------------------------------------
-- 9. PC_ADMIN_USERS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.pc_admin_users ENABLE ROW LEVEL SECURITY;

-- Policies already defined in multi_tenant_rbac.sql; we keep them as is.
-- Ensure RLS is enabled (already done in that migration).

-- --------------------------------------------------------------------------
-- 10. USER_ROLES TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies already defined in multi_tenant_rbac.sql.

-- --------------------------------------------------------------------------
-- 11. PC_AUDIT_LOGS TABLE
-- --------------------------------------------------------------------------
ALTER TABLE public.pc_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_audit_logs_super_admin_all" ON public.pc_audit_logs;
DROP POLICY IF EXISTS "pc_audit_logs_reseller_manage_own" ON public.pc_audit_logs;
DROP POLICY IF EXISTS "pc_audit_logs_site_manager_read_own" ON public.pc_audit_logs;
DROP POLICY IF EXISTS "pc_audit_logs_viewer_read_own" ON public.pc_audit_logs;

-- Select: super_admin can see all; reseller can see logs for their sites; site_manager/viewer can see logs for their site
CREATE POLICY "pc_audit_logs_select_scoped"
  ON public.pc_audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.sites s ON s.id = ur.site_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('site_manager','viewer')
        AND s.id = (SELECT site_id FROM public.pc_audit_logs WHERE id = id LIMIT 1)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.sites s ON s.reseller_id = ur.reseller_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'reseller'
        AND s.id = (SELECT site_id FROM public.pc_audit_logs WHERE id = id LIMIT 1)
    )
  );

-- Insert: super_admin or reseller (when creating logs for their sites)
CREATE POLICY "pc_audit_logs_insert_scoped"
  ON public.pc_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'reseller'
        AND ur.reseller_id = (SELECT site_id FROM public.pc_audit_logs WHERE id = id LIMIT 1)
    )
  );

-- Update/delete: super_admin only (logs are append-only)
CREATE POLICY "pc_audit_logs_modify_scoped"
  ON public.pc_audit_logs FOR UPDATE OR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- Grant execute on helper functions to authenticated (if not already)
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reseller_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_site(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;