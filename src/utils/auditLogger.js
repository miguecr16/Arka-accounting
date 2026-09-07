import { supabase } from '../supabaseClient';

const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * Global helper to log actions to the `audit_logs` table.
 * @param {Object} params
 * @param {string} params.action - e.g. 'Creó', 'Editó', 'Actualizó Estado', 'Aprobó'
 * @param {string} params.entity - e.g. 'Proyecto', 'Gasto', 'Change Order'
 * @param {string} params.details - Descriptive summary of the change
 * @param {string} [params.organization_id] - Optional organization UUID
 */
export async function logAuditEvent({ action, entity, details, organization_id }) {
  try {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      user_email: user.email || 'unknown@arkadesign.com',
      action: action || 'Acción',
      entity: entity || 'General',
      details: details || '',
      organization_id: organization_id || DEFAULT_ORG_ID
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([payload]);

    if (error) {
      console.warn('Audit logging warning:', error.message);
    }
  } catch (err) {
    console.warn('Failed to dispatch audit log:', err);
  }
}
