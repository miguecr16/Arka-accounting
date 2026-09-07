import { supabase } from '../supabaseClient';

/**
 * Global helper to log actions to the `audit_logs` table.
 * @param {Object} params
 * @param {string} params.action - e.g. 'Creó', 'Editó', 'Actualizó Estado', 'Aprobó'
 * @param {string} params.entity - e.g. 'Proyecto', 'Gasto', 'Change Order'
 * @param {string} params.details - Descriptive summary of the change
 */
export async function logAuditEvent({ action, entity, details }) {
  try {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      user_email: user.email || 'unknown@arkadesign.com',
      action: action || 'Acción',
      entity: entity || 'General',
      details: details || ''
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
