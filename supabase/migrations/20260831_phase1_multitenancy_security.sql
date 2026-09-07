-- =========================================================================
-- ARKA DESIGN GROUP — PHASE 1 MIGRATION
-- Multi-Tenancy, Tenant Integrity & Row Level Security (RLS) Hardening
-- =========================================================================

BEGIN;

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Organization Members Table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'trabajador' CHECK (role IN ('admin', 'trabajador')),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

-- 3. Seed Default Primary Organization ("ARKA Design Group")
INSERT INTO public.organizations (id, name, slug)
VALUES ('a0000000-0000-0000-0000-000000000001', 'ARKA Design Group', 'arka-design-group')
ON CONFLICT (id) DO NOTHING;

-- 4. Backfill Existing Profiles into Organization Members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
    'a0000000-0000-0000-0000-000000000001' AS organization_id,
    p.id AS user_id,
    COALESCE(p.role, 'trabajador') AS role
FROM public.profiles p
ON CONFLICT (organization_id, user_id) DO UPDATE 
SET role = EXCLUDED.role;

-- 5. Add organization_id to Projects (Safe Step-wise Backfill)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN organization_id UUID;
    END IF;
END $$;

UPDATE public.projects 
SET organization_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

ALTER TABLE public.projects 
    ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'projects' AND constraint_name = 'fk_projects_organization'
    ) THEN
        ALTER TABLE public.projects 
            ADD CONSTRAINT fk_projects_organization 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Unique constraint for composite multi-tenant FK integrity
ALTER TABLE public.projects 
    DROP CONSTRAINT IF EXISTS uq_projects_id_org,
    ADD CONSTRAINT uq_projects_id_org UNIQUE (id, organization_id);

-- 6. Add organization_id to Expenses_and_Hours
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'expenses_and_hours' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.expenses_and_hours ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- Populate organization_id from parent project
UPDATE public.expenses_and_hours e
SET organization_id = p.organization_id
FROM public.projects p
WHERE e.project_id = p.id AND e.organization_id IS NULL;

-- Fallback for any orphan records to default org
UPDATE public.expenses_and_hours 
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.expenses_and_hours 
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.expenses_and_hours
    DROP CONSTRAINT IF EXISTS fk_expenses_project_org,
    ADD CONSTRAINT fk_expenses_project_org 
        FOREIGN KEY (project_id, organization_id) REFERENCES public.projects(id, organization_id) ON DELETE CASCADE;

-- 7. Add organization_id to Change_Orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_orders' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.change_orders ADD COLUMN organization_id UUID;
    END IF;
END $$;

-- Populate organization_id from parent project
UPDATE public.change_orders c
SET organization_id = p.organization_id
FROM public.projects p
WHERE c.project_id = p.id AND c.organization_id IS NULL;

UPDATE public.change_orders 
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.change_orders 
    ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.change_orders
    DROP CONSTRAINT IF EXISTS fk_change_orders_project_org,
    ADD CONSTRAINT fk_change_orders_project_org 
        FOREIGN KEY (project_id, organization_id) REFERENCES public.projects(id, organization_id) ON DELETE CASCADE;

-- 8. Add organization_id to Audit_Logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN organization_id UUID;
    END IF;
END $$;

UPDATE public.audit_logs 
SET organization_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE organization_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'audit_logs' AND constraint_name = 'fk_audit_logs_organization'
    ) THEN
        ALTER TABLE public.audit_logs 
            ADD CONSTRAINT fk_audit_logs_organization 
            FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 9. Performance & Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_proj ON public.expenses_and_hours(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_org_proj ON public.change_orders(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id, created_at DESC);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS & POLICIES
-- =========================================================================

-- Helper function to fetch organizations for current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- Helper function to check if current user is admin in organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = org_id 
          AND user_id = auth.uid() 
          AND role = 'admin'
    );
$$;

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses_and_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Organizations
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can update their organizations" ON public.organizations;
CREATE POLICY "Admins can update their organizations" ON public.organizations
    FOR UPDATE USING (public.is_org_admin(id));

-- Policies for Organization Members
DROP POLICY IF EXISTS "Members can view team members" ON public.organization_members;
CREATE POLICY "Members can view team members" ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage team members" ON public.organization_members;
CREATE POLICY "Admins can manage team members" ON public.organization_members
    FOR ALL USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- Policies for Projects
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
CREATE POLICY "Users can view projects in their organization" ON public.projects
    FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Members can create projects in their organization" ON public.projects;
CREATE POLICY "Members can create projects in their organization" ON public.projects
    FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can update projects in their organization" ON public.projects;
CREATE POLICY "Admins can update projects in their organization" ON public.projects
    FOR UPDATE USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can delete projects in their organization" ON public.projects;
CREATE POLICY "Admins can delete projects in their organization" ON public.projects
    FOR DELETE USING (public.is_org_admin(organization_id));

-- Policies for Expenses and Hours
DROP POLICY IF EXISTS "Users can view expenses in their organization" ON public.expenses_and_hours;
CREATE POLICY "Users can view expenses in their organization" ON public.expenses_and_hours
    FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Members can log expenses in their organization" ON public.expenses_and_hours;
CREATE POLICY "Members can log expenses in their organization" ON public.expenses_and_hours
    FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses_and_hours;
CREATE POLICY "Admins can update expenses" ON public.expenses_and_hours
    FOR UPDATE USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses_and_hours;
CREATE POLICY "Admins can delete expenses" ON public.expenses_and_hours
    FOR DELETE USING (public.is_org_admin(organization_id));

-- Policies for Change Orders
DROP POLICY IF EXISTS "Users can view change orders in their organization" ON public.change_orders;
CREATE POLICY "Users can view change orders in their organization" ON public.change_orders
    FOR SELECT USING (organization_id IN (SELECT public.get_user_org_ids()));

DROP POLICY IF EXISTS "Admins can manage change orders" ON public.change_orders;
CREATE POLICY "Admins can manage change orders" ON public.change_orders
    FOR ALL USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- Policies for Audit Logs (Immutable History)
DROP POLICY IF EXISTS "Admins can view organization audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view organization audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        (organization_id IS NULL OR organization_id IN (SELECT public.get_user_org_ids()))
    );

-- 10. Recreate Dashboard View with Security Invoker Enabled (Protects View from Anon RLS Bypass)
DROP VIEW IF EXISTS public.projects_dashboard_view;
CREATE OR REPLACE VIEW public.projects_dashboard_view 
WITH (security_invoker = true)
AS
SELECT 
    p.id AS project_id,
    p.organization_id,
    p.project_name,
    p.client_name,
    p.status,
    p.start_date,
    p.base_contract_value,
    p.deposit_received,
    
    COALESCE(e.total_hours, 0) AS total_hours,
    COALESCE(e.total_direct_costs, 0) AS total_direct_costs,
    COALESCE(c.approved_change_orders, 0) AS approved_change_orders,
    
    (p.base_contract_value + COALESCE(c.approved_change_orders, 0)) AS final_contract_value,
    ((p.base_contract_value + COALESCE(c.approved_change_orders, 0)) - COALESCE(e.total_direct_costs, 0)) AS gross_profit,
    
    CASE 
        WHEN (p.base_contract_value + COALESCE(c.approved_change_orders, 0)) = 0 THEN 0 
        ELSE 
            ROUND(
                (
                    ((p.base_contract_value + COALESCE(c.approved_change_orders, 0)) - COALESCE(e.total_direct_costs, 0)) 
                    / 
                    (p.base_contract_value + COALESCE(c.approved_change_orders, 0))
                ) * 100, 
            2)
    END AS gross_margin_percentage
FROM 
    public.projects p
LEFT JOIN (
    SELECT 
        project_id,
        organization_id,
        SUM(cost_amount) AS total_direct_costs,
        SUM(hours_worked) AS total_hours
    FROM public.expenses_and_hours
    GROUP BY project_id, organization_id
) e ON p.id = e.project_id AND p.organization_id = e.organization_id
LEFT JOIN (
    SELECT 
        project_id,
        organization_id,
        SUM(extra_charge_to_client) AS approved_change_orders
    FROM public.change_orders
    WHERE status IN ('Aprobado', 'Approved')
    GROUP BY project_id, organization_id
) c ON p.id = c.project_id AND p.organization_id = c.organization_id;

COMMIT;
