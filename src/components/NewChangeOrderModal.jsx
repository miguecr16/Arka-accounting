import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { X } from 'lucide-react';
import './Dashboard.css';

export default function NewChangeOrderModal({ projectId, onClose, onCreated, changeOrderToEdit }) {
  const { t } = useLanguage();
  const { organization, organizationId } = useOrganization();
  const isEditMode = !!changeOrderToEdit;

  const [description, setDescription] = useState('');
  const [extraCharge, setExtraCharge] = useState('');
  const [status, setStatus] = useState('Borrador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (changeOrderToEdit) {
      setDescription(changeOrderToEdit.description || '');
      setExtraCharge(changeOrderToEdit.extra_charge_to_client !== undefined ? String(changeOrderToEdit.extra_charge_to_client) : '');
      setStatus(changeOrderToEdit.status || 'Borrador');
    }
  }, [changeOrderToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const charge = parseFloat(extraCharge);

      const payload = {
        project_id: projectId,
        description: description.trim(),
        extra_charge_to_client: isNaN(charge) ? 0 : charge,
        status
      };

      // Retrieve active organization_id with multi-layer fallback
      let activeOrgId = organization?.id || organizationId;

      // 1. If not available from context, fetch from the parent project (guaranteed to match project RLS)
      if (!activeOrgId && projectId) {
        try {
          const { data: projData } = await supabase
            .from('projects')
            .select('organization_id')
            .eq('id', projectId)
            .single();
          if (projData?.organization_id) {
            activeOrgId = projData.organization_id;
          }
        } catch (e) {
          console.warn('Could not fetch project organization_id:', e);
        }
      }

      // 2. If still not available, fetch from current user profile
      if (!activeOrgId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .single();
            if (profile?.organization_id) {
              activeOrgId = profile.organization_id;
            }
          }
        } catch (e) {
          console.warn('Could not fetch profile organization_id:', e);
        }
      }

      // 3. Fallback to primary organization id if still undefined
      if (!activeOrgId) {
        activeOrgId = 'a0000000-0000-0000-0000-000000000001';
      }

      if (isEditMode) {
        const updatePayload = {
          ...payload,
          organization_id: activeOrgId
        };

        const { error: dbError } = await supabase
          .from('change_orders')
          .update(updatePayload)
          .eq('id', changeOrderToEdit.id);

        if (dbError) throw dbError;

        // Log audit event for Change Order edit
        await logAuditEvent({
          action: 'Editó',
          entity: 'Change Order',
          details: `Actualizó Change Order #${changeOrderToEdit.id}: "${description.trim()}" ($${payload.extra_charge_to_client}, ${status})`
        });
      } else {
        const insertPayload = {
          ...payload,
          organization_id: activeOrgId
        };

        const { error: dbError } = await supabase
          .from('change_orders')
          .insert([insertPayload]);

        if (dbError) throw dbError;

        // Log audit event for Change Order creation
        await logAuditEvent({
          action: 'Creó',
          entity: 'Change Order',
          details: `Creó Change Order: "${description.trim()}" ($${payload.extra_charge_to_client}, ${status}) en proyecto ID #${projectId}`
        });
      }

      onCreated();
    } catch (err) {
      console.error('Error saving change order:', err);
      setError(err.message || 'Failed to save change order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontFamily: 'var(--font-display)' }}>
            {isEditMode ? t('changeOrderForm.modalTitleEdit') : t('changeOrderForm.modalTitleNew')}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--arka-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="description">{t('changeOrderForm.descriptionLabel')}</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="extra_charge">{t('changeOrderForm.extraChargeLabel')}</label>
            <div className="currency-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                id="extra_charge"
                value={extraCharge}
                onChange={(e) => setExtraCharge(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status">{t('changeOrderForm.statusLabel')}</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              <option value="Borrador">{t('changeOrderForm.statusBorrador')}</option>
              <option value="Aprobado">{t('changeOrderForm.statusAprobado')}</option>
              <option value="Rechazado">{t('changeOrderForm.statusRechazado')}</option>
            </select>
            <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
              {t('changeOrderForm.statusHint')}
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading 
                ? t('common.saving') 
                : (isEditMode ? t('changeOrderForm.updateBtn') : t('changeOrderForm.saveBtn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
