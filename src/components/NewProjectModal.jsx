import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Dashboard.css';

export default function NewProjectModal({ onClose, onProjectCreated }) {
  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    base_contract_value: '',
    deposit_received: '',
    project_type: 'Cocina',
    // Cabinet Scope fields
    tipo_construccion: '',
    proveedor: '',
    linea_modelo: 'Shaker',
    color: '',
    cantidad_cabinets: '',
    costo_cabinets: '',
    ensamble: '',
    costo_hardware: '',
    costo_accesorios: '',
    costo_delivery: '',
    costo_instalacion: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isKitchenProject = (formData.project_type || '').includes('Cocina');

  // Real-time calculation of Total Cabinets Cost
  const totalCabinetsCost = (
    parseFloat(formData.costo_cabinets || 0) +
    parseFloat(formData.ensamble || 0) +
    parseFloat(formData.costo_hardware || 0) +
    parseFloat(formData.costo_accesorios || 0) +
    parseFloat(formData.costo_delivery || 0) +
    parseFloat(formData.costo_instalacion || 0)
  );

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const baseContract = parseFloat(formData.base_contract_value || 0);
      const deposit = parseFloat(formData.deposit_received || 0);

      // Build scope_details JSONB if kitchen project
      let scopeDetailsJson = null;
      if (isKitchenProject) {
        scopeDetailsJson = {
          tipo_construccion: formData.tipo_construccion.trim(),
          proveedor: formData.proveedor.trim(),
          linea_modelo: formData.linea_modelo,
          color: formData.color.trim(),
          cantidad_cabinets: formData.cantidad_cabinets ? Number(formData.cantidad_cabinets) : 0,
          costo_cabinets: parseFloat(formData.costo_cabinets || 0),
          ensamble: parseFloat(formData.ensamble || 0),
          costo_hardware: parseFloat(formData.costo_hardware || 0),
          costo_accesorios: parseFloat(formData.costo_accesorios || 0),
          costo_delivery: parseFloat(formData.costo_delivery || 0),
          costo_instalacion: parseFloat(formData.costo_instalacion || 0),
          total_cabinets_cost: totalCabinetsCost
        };
      }

      const payload = {
        project_name: formData.project_name.trim(),
        client_name: formData.client_name.trim(),
        base_contract_value: isNaN(baseContract) ? 0 : baseContract,
        deposit_received: isNaN(deposit) ? 0 : deposit,
        project_type: formData.project_type,
        scope_details: scopeDetailsJson
      };

      const { error: dbError } = await supabase
        .from('projects')
        .insert([payload]);

      if (dbError) throw dbError;

      onProjectCreated();
    } catch (err) {
      console.error('Error creating project intake:', err);
      setError(err.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>New Project Intake Wizard</h3>
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
          {/* SECTION 1: GENERAL & FINANCIAL INFORMATION */}
          <div className="wizard-section">
            <div className="wizard-section-title">1. General & Financial Baseline</div>
            
            <div className="wizard-grid-2">
              <div className="form-group">
                <label htmlFor="project_name">Project Name</label>
                <input
                  type="text"
                  id="project_name"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  placeholder="e.g. Modern Villa Kitchen"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="client_name">Client Name</label>
                <input
                  type="text"
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  placeholder="e.g. John & Sarah Doe"
                  required
                />
              </div>
            </div>

            <div className="wizard-grid-3">
              <div className="form-group">
                <label htmlFor="project_type">Project Type</label>
                <select
                  id="project_type"
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleChange}
                  required
                >
                  <option value="Cocina">Cocina</option>
                  <option value="Baños">Baños</option>
                  <option value="Cocina y Baños">Cocina y Baños</option>
                  <option value="Remodelación Completa">Remodelación Completa</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="base_contract_value">Base Contract Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="base_contract_value"
                  name="base_contract_value"
                  value={formData.base_contract_value}
                  onChange={handleChange}
                  placeholder="e.g. 35000.00"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="deposit_received">Deposit / Anticipo ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="deposit_received"
                  name="deposit_received"
                  value={formData.deposit_received}
                  onChange={handleChange}
                  placeholder="e.g. 15000.00"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CONDITIONAL CABINETS SCOPE (JSONB) */}
          {isKitchenProject && (
            <div className="wizard-section slide-down">
              <div className="wizard-section-title">
                <span>🗄️ 2. Cabinets Scope Breakdown (Scope Details)</span>
                <span className="live-cost-badge">
                  Est. Cabinets Total: <strong>{formatCurrency(totalCabinetsCost)}</strong>
                </span>
              </div>

              <div className="wizard-grid-2">
                <div className="form-group">
                  <label htmlFor="tipo_construccion">Tipo de Construcción</label>
                  <input
                    type="text"
                    id="tipo_construccion"
                    name="tipo_construccion"
                    value={formData.tipo_construccion}
                    onChange={handleChange}
                    placeholder="e.g. Remodelación / New Construction"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="proveedor">Proveedor / Vendor</label>
                  <input
                    type="text"
                    id="proveedor"
                    name="proveedor"
                    value={formData.proveedor}
                    onChange={handleChange}
                    placeholder="e.g. Woodex"
                  />
                </div>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="linea_modelo">Línea / Modelo</label>
                  <select
                    id="linea_modelo"
                    name="linea_modelo"
                    value={formData.linea_modelo}
                    onChange={handleChange}
                  >
                    <option value="Shaker">Shaker</option>
                    <option value="Custom">Custom</option>
                    <option value="Flat Panel">Flat Panel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="color">Color / Finish</label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="e.g. Matte Gray"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cantidad_cabinets">Cantidad de Cabinets</label>
                  <input
                    type="number"
                    min="0"
                    id="cantidad_cabinets"
                    name="cantidad_cabinets"
                    value={formData.cantidad_cabinets}
                    onChange={handleChange}
                    placeholder="e.g. 18"
                  />
                </div>
              </div>

              <div className="wizard-costs-grid">
                <div className="form-group">
                  <label htmlFor="costo_cabinets">Costo Cabinets ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_cabinets"
                    name="costo_cabinets"
                    value={formData.costo_cabinets}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ensamble">Ensamble ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="ensamble"
                    name="ensamble"
                    value={formData.ensamble}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="costo_hardware">Hardware ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_hardware"
                    name="costo_hardware"
                    value={formData.costo_hardware}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="costo_accesorios">Accesorios ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_accesorios"
                    name="costo_accesorios"
                    value={formData.costo_accesorios}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="costo_delivery">Delivery ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_delivery"
                    name="costo_delivery"
                    value={formData.costo_delivery}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="costo_instalacion">Instalación ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_instalacion"
                    name="costo_instalacion"
                    value={formData.costo_instalacion}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.75rem' }}>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading} style={{ margin: 0, padding: '0.85rem 1.75rem' }}>
              {loading ? 'Creating Project...' : 'Complete Intake & Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
