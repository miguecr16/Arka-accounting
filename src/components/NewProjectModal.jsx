import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import './Dashboard.css';

export default function NewProjectModal({ onClose, onProjectCreated, projectToEdit }) {
  const isEditMode = !!projectToEdit;

  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    status: 'Planeación',
    base_contract_value: '',
    deposit_received: '',
    project_type: 'Cocina',
    // 1. Cabinet Scope fields
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
    costo_instalacion: '',
    // 2. Countertop Scope fields
    countertop_material: 'Quartz',
    countertop_color: '',
    countertop_proveedor: '',
    valor_slab: '',
    cantidad_slabs: '',
    sqft_estimados: '',
    costo_fabricacion: '',
    costo_instalacion: '',
    costo_transporte: ''
  });

  // 3. Dynamic Measurements Table (Tabla de Medidas)
  const [medidas, setMedidas] = useState([
    { area: 'Island', largo: '', profundidad: '' },
    { area: 'Perimeter', largo: '', profundidad: '' },
    { area: 'Back Splash', largo: '', profundidad: '' },
    { area: 'Laundry', largo: '', profundidad: '' },
    { area: 'Bathroom Master', largo: '', profundidad: '' },
    { area: 'Bathroom Guest 1', largo: '', profundidad: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill fields if editing existing project
  useEffect(() => {
    if (projectToEdit) {
      const scope = projectToEdit.scope_details || {};
      const cabs = scope.cabinets || {};
      const counts = scope.countertops || {};
      const medList = counts.medidas;

      setFormData({
        project_name: projectToEdit.project_name || '',
        client_name: projectToEdit.client_name || '',
        status: projectToEdit.status || 'Planeación',
        base_contract_value: projectToEdit.base_contract_value !== undefined ? String(projectToEdit.base_contract_value) : '',
        deposit_received: projectToEdit.deposit_received !== undefined ? String(projectToEdit.deposit_received) : '',
        project_type: projectToEdit.project_type || 'Cocina',
        // Cabinets
        tipo_construccion: cabs.tipo_construccion || '',
        proveedor: cabs.proveedor || '',
        linea_modelo: cabs.linea_modelo || 'Shaker',
        color: cabs.color || '',
        cantidad_cabinets: cabs.cantidad_cabinets !== undefined ? String(cabs.cantidad_cabinets) : '',
        costo_cabinets: cabs.costo_cabinets !== undefined ? String(cabs.costo_cabinets) : '',
        ensamble: cabs.ensamble !== undefined ? String(cabs.ensamble) : '',
        costo_hardware: cabs.costo_hardware !== undefined ? String(cabs.costo_hardware) : '',
        costo_accesorios: cabs.costo_accesorios !== undefined ? String(cabs.costo_accesorios) : '',
        costo_delivery: cabs.costo_delivery !== undefined ? String(cabs.costo_delivery) : '',
        costo_instalacion: cabs.costo_instalacion !== undefined ? String(cabs.costo_instalacion) : '',
        // Countertops
        countertop_material: counts.material || 'Quartz',
        countertop_color: counts.color || '',
        countertop_proveedor: counts.proveedor || '',
        valor_slab: counts.valor_slab !== undefined ? String(counts.valor_slab) : '',
        cantidad_slabs: counts.cantidad_slabs !== undefined ? String(counts.cantidad_slabs) : '',
        sqft_estimados: counts.sqft_estimados !== undefined ? String(counts.sqft_estimados) : '',
        costo_fabricacion: counts.costo_fabricacion !== undefined ? String(counts.costo_fabricacion) : '',
        costo_instalacion: counts.costo_instalacion !== undefined ? String(counts.costo_instalacion) : '',
        costo_transporte: counts.costo_transporte !== undefined ? String(counts.costo_transporte) : ''
      });

      if (Array.isArray(medList) && medList.length > 0) {
        setMedidas(medList.map((m) => ({
          area: m.area || '',
          largo: m.largo !== undefined ? String(m.largo) : '',
          profundidad: m.profundidad !== undefined ? String(m.profundidad) : ''
        })));
      }
    }
  }, [projectToEdit]);

  const isKitchenProject = (formData.project_type || '').includes('Cocina');
  const hasCountertopScope = (formData.project_type || '').includes('Cocina') || 
                             (formData.project_type || '').includes('Baños') || 
                             (formData.project_type || '').includes('Remodelación Completa');

  // Real-time calculation of Measurements Table Total SQ FT
  const totalMedidasSqFt = medidas.reduce((sum, item) => {
    const l = parseFloat(item.largo || 0);
    const p = parseFloat(item.profundidad || 0);
    return sum + (l * p);
  }, 0);

  const effectiveSqFt = totalMedidasSqFt > 0 
    ? totalMedidasSqFt 
    : parseFloat(formData.sqft_estimados || 0);

  const totalCabinetsCost = (
    parseFloat(formData.costo_cabinets || 0) +
    parseFloat(formData.ensamble || 0) +
    parseFloat(formData.costo_hardware || 0) +
    parseFloat(formData.costo_accesorios || 0) +
    parseFloat(formData.costo_delivery || 0) +
    parseFloat(formData.costo_instalacion || 0)
  );

  const slabCost = parseFloat(formData.valor_slab || 0) * parseFloat(formData.cantidad_slabs || 0);
  const fabAndInstall = (parseFloat(formData.costo_fabricacion || 0) + parseFloat(formData.costo_instalacion || 0)) * (effectiveSqFt > 0 ? effectiveSqFt : 1);
  const transportCost = parseFloat(formData.costo_transporte || 0);
  const totalCountertopCost = slabCost + fabAndInstall + transportCost;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMedidaChange = (index, field, value) => {
    setMedidas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddArea = () => {
    setMedidas((prev) => [...prev, { area: '', largo: '', profundidad: '' }]);
  };

  const handleRemoveArea = (index) => {
    setMedidas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const baseContract = parseFloat(formData.base_contract_value || 0);
      const deposit = parseFloat(formData.deposit_received || 0);

      // Build structured scope_details JSONB
      const scopeDetails = {};

      if (isKitchenProject) {
        scopeDetails.cabinets = {
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

      if (hasCountertopScope) {
        const cleanedMedidas = medidas
          .filter((m) => m.area.trim() || m.largo || m.profundidad)
          .map((m) => {
            const l = parseFloat(m.largo || 0);
            const p = parseFloat(m.profundidad || 0);
            return {
              area: m.area.trim() || 'Custom Area',
              largo: l,
              profundidad: p,
              sq_ft: parseFloat((l * p).toFixed(2))
            };
          });

        scopeDetails.countertops = {
          material: formData.countertop_material,
          color: formData.countertop_color.trim(),
          proveedor: formData.countertop_proveedor.trim(),
          valor_slab: parseFloat(formData.valor_slab || 0),
          cantidad_slabs: parseFloat(formData.cantidad_slabs || 0),
          sqft_estimados: parseFloat(effectiveSqFt.toFixed(2)),
          costo_fabricacion: parseFloat(formData.costo_fabricacion || 0),
          costo_instalacion: parseFloat(formData.costo_instalacion || 0),
          costo_transporte: parseFloat(formData.costo_transporte || 0),
          total_countertop_cost: totalCountertopCost,
          medidas: cleanedMedidas
        };
      }

      const payload = {
        project_name: formData.project_name.trim(),
        client_name: formData.client_name.trim(),
        status: formData.status,
        base_contract_value: isNaN(baseContract) ? 0 : baseContract,
        deposit_received: isNaN(deposit) ? 0 : deposit,
        project_type: formData.project_type,
        scope_details: Object.keys(scopeDetails).length > 0 ? scopeDetails : null
      };

      if (isEditMode) {
        const targetId = projectToEdit.id || projectToEdit.project_id;
        const { error: dbError } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', targetId);

        if (dbError) throw dbError;

        // Log audit event for project edit
        await logAuditEvent({
          action: 'Editó',
          entity: 'Proyecto',
          details: `Actualizó proyecto "${formData.project_name.trim()}" (Cliente: ${formData.client_name.trim()}, Tipo: ${formData.project_type}, Valor: $${baseContract})`
        });
      } else {
        const { error: dbError } = await supabase
          .from('projects')
          .insert([payload]);

        if (dbError) throw dbError;

        // Log audit event for project creation
        await logAuditEvent({
          action: 'Creó',
          entity: 'Proyecto',
          details: `Creó nuevo proyecto "${formData.project_name.trim()}" (Cliente: ${formData.client_name.trim()}, Tipo: ${formData.project_type}, Valor: $${baseContract})`
        });
      }

      onProjectCreated();
    } catch (err) {
      console.error('Error saving project:', err);
      setError(err.message || 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>
            {isEditMode ? 'Edit Project Details' : 'New Project Intake Wizard'}
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
          {/* SECTION 1: GENERAL & FINANCIAL INFORMATION */}
          <div className="wizard-section">
            <div className="wizard-section-title">1. General & Financial Baseline</div>
            
            <div className="wizard-grid-3">
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

              <div className="form-group">
                <label htmlFor="status">Project Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="Planeación">Planeación</option>
                  <option value="En Ejecución">En Ejecución</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
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
                <span>🗄️ 2. Cabinets Scope Breakdown</span>
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

          {/* SECTION 3: CONDITIONAL COUNTERTOP SCOPE (JSONB) */}
          {hasCountertopScope && (
            <div className="wizard-section slide-down">
              <div className="wizard-section-title">
                <span>🪨 3. Countertop Scope Breakdown</span>
                <span className="live-cost-badge countertop-badge">
                  Est. Countertop Total: <strong>{formatCurrency(totalCountertopCost)}</strong>
                </span>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="countertop_material">Material</label>
                  <select
                    id="countertop_material"
                    name="countertop_material"
                    value={formData.countertop_material}
                    onChange={handleChange}
                  >
                    <option value="Quartz">Quartz</option>
                    <option value="Granite">Granite</option>
                    <option value="Quartzite">Quartzite</option>
                    <option value="Porcelain">Porcelain</option>
                    <option value="Laminate">Laminate</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="countertop_color">Color / Pattern</label>
                  <input
                    type="text"
                    id="countertop_color"
                    name="countertop_color"
                    value={formData.countertop_color}
                    onChange={handleChange}
                    placeholder="e.g. Calacatta Gold"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="countertop_proveedor">Proveedor / Fabricator</label>
                  <input
                    type="text"
                    id="countertop_proveedor"
                    name="countertop_proveedor"
                    value={formData.countertop_proveedor}
                    onChange={handleChange}
                    placeholder="e.g. STSTONES"
                  />
                </div>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="valor_slab">Valor Slab ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="valor_slab"
                    name="valor_slab"
                    value={formData.valor_slab}
                    onChange={handleChange}
                    placeholder="e.g. 750.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cantidad_slabs">Cantidad de Slabs</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    id="cantidad_slabs"
                    name="cantidad_slabs"
                    value={formData.cantidad_slabs}
                    onChange={handleChange}
                    placeholder="e.g. 2"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sqft_estimados">
                    Sq Ft Estimados {totalMedidasSqFt > 0 && <span style={{ color: '#059669', fontSize: '0.75rem' }}>(Auto-calculado)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    id="sqft_estimados"
                    name="sqft_estimados"
                    value={totalMedidasSqFt > 0 ? totalMedidasSqFt.toFixed(2) : formData.sqft_estimados}
                    onChange={handleChange}
                    placeholder="e.g. 60.5"
                    style={totalMedidasSqFt > 0 ? { backgroundColor: '#f0fdf4', fontWeight: 600, borderColor: '#86efac' } : {}}
                  />
                </div>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="costo_fabricacion">Costo Fabricación ($/sqft)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_fabricacion"
                    name="costo_fabricacion"
                    value={formData.costo_fabricacion}
                    onChange={handleChange}
                    placeholder="e.g. 25.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="costo_instalacion">Costo Instalación ($/sqft)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_instalacion"
                    name="costo_instalacion"
                    value={formData.costo_instalacion}
                    onChange={handleChange}
                    placeholder="e.g. 15.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="costo_transporte">Costo Transporte ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="costo_transporte"
                    name="costo_transporte"
                    value={formData.costo_transporte}
                    onChange={handleChange}
                    placeholder="e.g. 150.00"
                  />
                </div>
              </div>

              {/* 4. TABLA DE MEDIDAS (MEASUREMENTS TABLE) */}
              <div className="medidas-container">
                <div className="medidas-header">
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>📐 Tabla de Medidas</h4>
                    <small style={{ color: '#64748b' }}>Calcula el total de Sq Ft multiplicando Largo × Profundidad</small>
                  </div>
                  <div className="medidas-total-badge">
                    Total Medidas: <strong>{totalMedidasSqFt.toFixed(2)} sqft</strong>
                  </div>
                </div>

                <div className="medidas-table-wrapper">
                  <table className="medidas-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>Área</th>
                        <th style={{ width: '22%' }}>Largo (ft)</th>
                        <th style={{ width: '22%' }}>Profundidad (ft)</th>
                        <th style={{ width: '16%' }}>Sq Ft</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {medidas.map((item, idx) => {
                        const l = parseFloat(item.largo || 0);
                        const p = parseFloat(item.profundidad || 0);
                        const rowSqFt = (l * p).toFixed(2);

                        return (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                value={item.area}
                                onChange={(e) => handleMedidaChange(idx, 'area', e.target.value)}
                                placeholder="Nombre de Área"
                                className="medida-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={item.largo}
                                onChange={(e) => handleMedidaChange(idx, 'largo', e.target.value)}
                                placeholder="0.0"
                                className="medida-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={item.profundidad}
                                onChange={(e) => handleMedidaChange(idx, 'profundidad', e.target.value)}
                                placeholder="0.0"
                                className="medida-input"
                              />
                            </td>
                            <td>
                              <span className="row-sqft-badge">
                                {l > 0 && p > 0 ? rowSqFt : '0.00'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {medidas.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveArea(idx)}
                                  className="remove-area-btn"
                                  title="Remove area"
                                >
                                  &times;
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleAddArea}
                  className="add-area-btn"
                >
                  + Add Area
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.75rem' }}>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading} style={{ margin: 0, padding: '0.85rem 1.75rem' }}>
              {loading ? (isEditMode ? 'Saving Changes...' : 'Creating Project...') : (isEditMode ? 'Save Project Changes' : 'Complete Intake & Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
