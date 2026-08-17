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
    receipt_image_url: null,
    // Cabinets specific
    cabinet_provider: '',
    cabinet_model: '',
    cabinet_color: '',
    cabinet_quantity: '',
    // Countertops specific
    countertop_material: '',
    countertop_provider: '',
    countertop_slabs: '',
    countertop_sqft: ''
  });

  const isLabor = formData.category === 'Mano de Obra';
  const isCabinets = formData.category === 'Cabinets';
  const isCountertops = formData.category === 'Countertops';

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

      // Build category-specific details JSONB
      let detailsJson = null;
      if (isCabinets) {
        detailsJson = {
          provider: formData.cabinet_provider.trim(),
          model: formData.cabinet_model.trim(),
          color: formData.cabinet_color.trim(),
          quantity: formData.cabinet_quantity ? Number(formData.cabinet_quantity) : null
        };
      } else if (isCountertops) {
        detailsJson = {
          material: formData.countertop_material.trim(),
          provider: formData.countertop_provider.trim(),
          slabs: formData.countertop_slabs ? Number(formData.countertop_slabs) : null,
          sqft: formData.countertop_sqft ? Number(formData.countertop_sqft) : null
        };
      }

      const payload = {
        project_id: targetProjectId,
        date: formData.date,
        category: formData.category,
        cost_amount: isLabor ? 0 : parseFloat(formData.cost_amount || 0),
        hours_worked: isLabor ? parseFloat(formData.hours_worked || 0) : 0,
        receipt_image_url: receiptPath,
        details: detailsJson
      };

      const { error: dbError } = await supabase
        .from('expenses_and_hours')
        .insert([payload]);

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
              <option value="Mano de Obra">Mano de Obra (Labor)</option>
              <option value="Cabinets">Cabinets</option>
              <option value="Countertops">Countertops</option>
              <option value="Subcontratista">Subcontratista</option>
            </select>
          </div>

          {/* 1. MANO DE OBRA / LABOR */}
          {isLabor && (
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
          )}

          {/* 2. ALL NON-LABOR CATEGORIES: COST & RECEIPT */}
          {!isLabor && (
            <>
              <div className="form-group slide-down">
                <label htmlFor="cost_amount">Total Cost Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="cost_amount"
                  name="cost_amount"
                  value={formData.cost_amount}
                  onChange={handleChange}
                  placeholder="e.g. 1500.00"
                  required
                />
              </div>

              {/* 3. DYNAMIC CABINETS FIELDS */}
              {isCabinets && (
                <div className="dynamic-subform slide-down">
                  <div className="subform-title">🗄️ Cabinet Specifications</div>
                  <div className="dynamic-grid">
                    <div className="form-group">
                      <label htmlFor="cabinet_provider">Provider / Vendor</label>
                      <input
                        type="text"
                        id="cabinet_provider"
                        name="cabinet_provider"
                        value={formData.cabinet_provider}
                        onChange={handleChange}
                        placeholder="e.g. Woodex"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cabinet_model">Line / Model</label>
                      <input
                        type="text"
                        id="cabinet_model"
                        name="cabinet_model"
                        value={formData.cabinet_model}
                        onChange={handleChange}
                        placeholder="e.g. Shaker White"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cabinet_color">Color / Finish</label>
                      <input
                        type="text"
                        id="cabinet_color"
                        name="cabinet_color"
                        value={formData.cabinet_color}
                        onChange={handleChange}
                        placeholder="e.g. Matte White"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cabinet_quantity">Quantity (Boxes/Units)</label>
                      <input
                        type="number"
                        min="1"
                        id="cabinet_quantity"
                        name="cabinet_quantity"
                        value={formData.cabinet_quantity}
                        onChange={handleChange}
                        placeholder="e.g. 14"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DYNAMIC COUNTERTOPS FIELDS */}
              {isCountertops && (
                <div className="dynamic-subform slide-down">
                  <div className="subform-title">🪨 Countertop Specifications</div>
                  <div className="dynamic-grid">
                    <div className="form-group">
                      <label htmlFor="countertop_material">Material Type</label>
                      <input
                        type="text"
                        id="countertop_material"
                        name="countertop_material"
                        value={formData.countertop_material}
                        onChange={handleChange}
                        placeholder="e.g. Calacatta Quartz / Granite"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="countertop_provider">Provider / Fabricator</label>
                      <input
                        type="text"
                        id="countertop_provider"
                        name="countertop_provider"
                        value={formData.countertop_provider}
                        onChange={handleChange}
                        placeholder="e.g. Stone Depot"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="countertop_slabs">Number of Slabs</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        id="countertop_slabs"
                        name="countertop_slabs"
                        value={formData.countertop_slabs}
                        onChange={handleChange}
                        placeholder="e.g. 2"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="countertop_sqft">Square Feet (Sq Ft)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        id="countertop_sqft"
                        name="countertop_sqft"
                        value={formData.countertop_sqft}
                        onChange={handleChange}
                        placeholder="e.g. 55.5"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

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
