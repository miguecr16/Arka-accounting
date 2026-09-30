import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export const DEFAULT_PRIMARY_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

const DEFAULT_ORGANIZATION = {
  id: DEFAULT_PRIMARY_ORG_ID,
  name: 'Arka Design Group',
  slug: 'arka-design-group',
  logo_url: null,
  primary_color: '#C9A45C',
  secondary_color: '#0D1726',
  phone: '+1 (813) 610-9309',
  email: 'info@arkadg.com',
  address: '2312 SE 18th Cir, Ocala, FL 34471',
  website: 'https://www.arkadg.com',
  invoice_terms: 'Quote is based on design and floorplans sent by customer. Plumbing and electrical are not included. Our company does not do any structural work.'
};

function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string') return `rgba(201, 164, 92, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    if (!isNaN(num)) {
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return hex;
}

function applyThemeVariables(primaryColor, secondaryColor) {
  const root = document.documentElement;
  const primary = primaryColor || DEFAULT_ORGANIZATION.primary_color;
  const secondary = secondaryColor || DEFAULT_ORGANIZATION.secondary_color;

  root.style.setProperty('--arka-gold', primary);
  root.style.setProperty('--arka-gold-soft', hexToRgba(primary, 0.8));
  root.style.setProperty('--arka-gold-glow', hexToRgba(primary, 0.12));
  root.style.setProperty('--arka-gold-border', hexToRgba(primary, 0.25));
  root.style.setProperty('--arka-gold-subtle', hexToRgba(primary, 0.05));
  root.style.setProperty('--arka-navy', secondary);
}

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const [organization, setOrganization] = useState(DEFAULT_ORGANIZATION);
  const [organizationId, setOrganizationId] = useState(DEFAULT_PRIMARY_ORG_ID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrganization = useCallback(async (userId) => {
    if (!userId) {
      setOrganization(DEFAULT_ORGANIZATION);
      setOrganizationId(DEFAULT_PRIMARY_ORG_ID);
      applyThemeVariables(DEFAULT_ORGANIZATION.primary_color, DEFAULT_ORGANIZATION.secondary_color);
      document.title = `${DEFAULT_ORGANIZATION.name} - OS`;
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch user's organization_id from profiles row
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.warn('Could not fetch user profile organization_id:', profileErr.message);
      }

      let targetOrgId = profile?.organization_id;
      let orgRecord = null;

      // 2. Fetch full organization record from public.organizations
      if (targetOrgId) {
        const { data, error: orgErr } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, primary_color, secondary_color, phone, email, address, website, invoice_terms')
          .eq('id', targetOrgId)
          .single();

        if (!orgErr && data) {
          orgRecord = data;
        } else if (orgErr) {
          console.warn('Error fetching organization by ID:', orgErr.message);
        }
      }

      // Fallback: If not found by targetOrgId, attempt to fetch user's accessible organization
      if (!orgRecord) {
        const { data: orgs, error: fallbackErr } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, primary_color, secondary_color, phone, email, address, website, invoice_terms')
          .limit(1);

        if (!fallbackErr && orgs && orgs.length > 0) {
          orgRecord = orgs[0];
          targetOrgId = orgs[0].id;
        }
      }

      if (orgRecord) {
        const merged = {
          ...DEFAULT_ORGANIZATION,
          ...orgRecord,
          name: orgRecord.name || DEFAULT_ORGANIZATION.name,
          logo_url: orgRecord.logo_url || null,
          primary_color: orgRecord.primary_color || DEFAULT_ORGANIZATION.primary_color,
          secondary_color: orgRecord.secondary_color || DEFAULT_ORGANIZATION.secondary_color,
          phone: orgRecord.phone || DEFAULT_ORGANIZATION.phone,
          email: orgRecord.email || DEFAULT_ORGANIZATION.email,
          address: orgRecord.address || DEFAULT_ORGANIZATION.address,
          website: orgRecord.website || DEFAULT_ORGANIZATION.website,
          invoice_terms: orgRecord.invoice_terms || DEFAULT_ORGANIZATION.invoice_terms
        };

        setOrganization(merged);
        setOrganizationId(targetOrgId || orgRecord.id);
        applyThemeVariables(merged.primary_color, merged.secondary_color);
        document.title = `${merged.name} - OS`;
      } else {
        setOrganization(DEFAULT_ORGANIZATION);
        setOrganizationId(targetOrgId || DEFAULT_PRIMARY_ORG_ID);
        applyThemeVariables(DEFAULT_ORGANIZATION.primary_color, DEFAULT_ORGANIZATION.secondary_color);
        document.title = `${DEFAULT_ORGANIZATION.name} - OS`;
      }
    } catch (err) {
      console.error('Failed to load organization data:', err);
      setError(err.message || 'Error loading organization');
      setOrganization(DEFAULT_ORGANIZATION);
      applyThemeVariables(DEFAULT_ORGANIZATION.primary_color, DEFAULT_ORGANIZATION.secondary_color);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to Supabase auth session & state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchOrganization(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchOrganization(session?.user?.id);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchOrganization]);

  const refreshOrganization = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchOrganization(session?.user?.id);
  }, [fetchOrganization]);

  const updateOrganizationLocally = useCallback((newFields) => {
    if (!newFields || typeof newFields !== 'object') return;
    setOrganization((prev) => {
      const merged = {
        ...prev,
        ...newFields
      };
      applyThemeVariables(merged.primary_color, merged.secondary_color);
      document.title = `${merged.name || 'OS'} - OS`;
      return merged;
    });
  }, []);

  const resolvedOrgId = organizationId || organization?.id || DEFAULT_PRIMARY_ORG_ID;
  const resolvedOrg = {
    ...organization,
    id: organization?.id || resolvedOrgId
  };

  const value = {
    organization: resolvedOrg,
    organizationId: resolvedOrgId,
    loading,
    error,
    refreshOrganization,
    updateOrganizationLocally
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
