import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import './Dashboard.css';

export default function NewChangeOrderModal({ projectId, onClose, onCreated, changeOrderToEdit }) {
  const isEditMode = !!changeOrderToEdit;

  const [formData, setFormData] = useState({
    description: '',
    extra_charge_to_client: '',
    status: 'Borrador'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (changeOrderToEdit) {
      setFormData({
        description: changeOrderToEdit.description || '',
        extra_charge_to_client: changeOrderToEdit.extra_charge_to_client !== undefined ? String(changeOrderToEdit.extra_charge_to_client) : '',
        status: changeOrderToEdit.status || 'Borrador'
      });
    }
  }, [changeOrderToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!projectId && !isEditMode) {
      setError('Project reference missing.');
      setLoading(false);
      return;
    }

    try {
      const charge = parseFloat(formData.extra_charge_to_client || 0);

      const payload = {
        description: formData.description.trim(),
        extra_charge_to_client: isNaN(charge) ? 0 : charge,
        status: formData.status
      };

      if (!isEditMode) {
        payload.project_id = projectId;
      }

      if (isEditMode) {
        const { error: dbError } = await supabase
          .from('change_orders')
          .update(payload)
          .eq('id', changeOrderToEdit.id);

        if (dbError) throw dbError;

        // Log audit event for Change Order update
        await logAuditEvent({
          action: 'Editó',
          entity: 'Change Order',
          details: `Actualizó Change Order: "${formData.description.trim()}" ($${charge}) - Estado: ${formData.status}`
        });
      } else {
        const { error: dbError } = await supabase
          .from('change_orders')
          .insert([payload]);

        if (dbError) throw dbError;

        // Log audit event for Change Order creation
        await logAuditEvent({
          action: 'Creó',
          entity: 'Change Order',
          details: `Creó Change Order: "${formData.description.trim()}" ($${charge}) - Estado: ${formData.status}`
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
          <h3 style={{ margin: 0 }}>
            {isEditMode ? 'Edit Change Order (Extra)' : 'New Change Order (Extra)'}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
          >
            &times;
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="description">Description / Scope of Work</label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Added custom backsplash tiling in master bathroom"
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                resize: 'vertical'
              }}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="extra_charge">Extra Charge to Client ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              id="extra_charge"
              value={formData.extra_charge_to_client}
              onChange={(e) => setFormData({ ...formData, extra_charge_to_client: e.target.value })}
              placeholder="e.g. 850.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="Borrador">Borrador (Draft)</option>
              <option value="Aprobado">Aprobado (Approved)</option>
              <option value="Rechazado">Rechazado (Rejected)</option>
            </select>
            <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
              Only <strong>Aprobado</strong> items will increase the Final Contract Value in the header.
            </small>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading} style={{ margin: 0 }}>
              {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Change Order' : 'Save Change Order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
