import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './NewExpenseForm.css';

export default function NewExpenseForm({ projectId, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    project_id: projectId || '',
    date: new Date().toISOString().split('T')[0],
    category: 'Materiales',
    cost_amount: '',
    hours_worked: '',
    receipt_image_url: null
  });

  const isLabor = formData.category === 'Mano de Obra';

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!supabase) {
      setError('Supabase client is not initialized.');
      setLoading(false);
      return;
    }

    const targetProjectId = projectId || formData.project_id;
    if (!targetProjectId) {
      setError('Missing project identifier.');
      setLoading(false);
      return;
    }

    try {
      let receiptPath = null;
      if (!isLabor && formData.receipt_image_url) {
        receiptPath = formData.receipt_image_url.name;
      }

      const { error: dbError } = await supabase
        .from('expenses_and_hours')
        .insert([
          {
            project_id: targetProjectId,
            date: formData.date,
            category: formData.category,
            cost_amount: isLabor ? 0 : parseFloat(formData.cost_amount || 0),
            hours_worked: isLabor ? parseFloat(formData.hours_worked || 0) : 0,
            receipt_image_url: receiptPath
          }
        ]);

      if (dbError) throw dbError;

      setSuccess(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 600);
      }
    } catch (err) {
      console.error("Detailed Submission Error:", err);
      setError(err.message || 'An error occurred while saving the record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={onClose ? "modal-overlay" : "form-container"}>
      <div className={onClose ? "modal-content" : ""}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Log Expense / Hours</h2>
          {onClose && (
            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
            >
              &times;
            </button>
          )}
        </div>
        
        {success && <div className="alert success">Record saved successfully!</div>}
        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="Materiales">Materiales</option>
              <option value="Mano de Obra">Mano de Obra</option>
              <option value="Subcontratista">Subcontratista</option>
              <option value="Cabinets">Cabinets</option>
              <option value="Countertops">Countertops</option>
            </select>
          </div>

          {isLabor ? (
            <div className="form-group slide-down">
              <label htmlFor="hours_worked">Hours Worked</label>
              <input
                type="number"
                step="0.25"
                min="0"
                id="hours_worked"
                name="hours_worked"
                value={formData.hours_worked}
                onChange={handleChange}
                placeholder="e.g. 4.5"
                required
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="form-group slide-down">
                <label htmlFor="cost_amount">Cost Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="cost_amount"
                  name="cost_amount"
                  value={formData.cost_amount}
                  onChange={handleChange}
                  placeholder="e.g. 150.00"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group slide-down">
                <label htmlFor="receipt_image_url">Receipt Image</label>
                <input
                  type="file"
                  id="receipt_image_url"
                  name="receipt_image_url"
                  accept="image/*"
                  capture="environment"
                  onChange={handleChange}
                />
                <small>Take a photo or upload receipt</small>
              </div>
            </>
          )}

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            {onClose && (
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" className="submit-btn" disabled={loading} style={{ margin: 0 }}>
              {loading ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
