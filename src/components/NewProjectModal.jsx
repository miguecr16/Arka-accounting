import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import './Dashboard.css';

export default function NewProjectModal({ onClose, onProjectCreated, projectToEdit }) {
  const { t } = useLanguage();
  const isEditMode = !!projectToEdit;

  const [formData, setFormData] = useState({
    project_name: '',
    client_name: '',
    status: 'Planeación',
    project_type: 'Cocina',
    base_contract_value: '',
    deposit_received: '',
    // Cabinets detailed scope
    tipo_construccion: 'Framed',
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
    // Countertop detailed scope
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

  // Dynamic Measurements Table state for Countertop Area SQ FT
  const [medidas, setMedidas] = useState([
    { area: 'Isla Principal', largo: '8', profundidad: '4' },
    { area: 'L-Shape Counter', largo: '10', profundidad: '2.5' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (projectToEdit) {
      const scope = projectToEdit.scope_details || {};
      const cab = scope.cabinets || {};
      const ct = scope.countertops || {};

      setFormData({
        project_name: projectToEdit.project_name || '',
        client_name: projectToEdit.client_name || '',
        status: projectToEdit.status || 'Planeación',
        project_type: projectToEdit.project_type || 'Cocina',
        base_contract_value: projectToEdit.base_contract_value !== undefined ? String(projectToEdit.base_contract_value) : '',
        deposit_received: projectToEdit.deposit_received !== undefined ? String(projectToEdit.deposit_received) : '',
        // Cabinets
        tipo_construccion: cab.tipo_construccion || 'Framed',
        proveedor: cab.proveedor || '',
        linea_modelo: cab.linea_modelo || 'Shaker',
        color: cab.color || '',
        cantidad_cabinets: cab.cantidad_cabinets !== undefined ? String(cab.cantidad_cabinets) : '',
        costo_cabinets: cab.costo_cabinets !== undefined ? String(cab.costo_cabinets) : '',
        ensamble: cab.ensamble !== undefined ? String(cab.ensamble) : '',
        costo_hardware: cab.costo_hardware !== undefined ? String(cab.costo_hardware) : '',
        costo_accesorios: cab.costo_accesorios !== undefined ? String(cab.costo_accesorios) : '',
        costo_delivery: cab.costo_delivery !== undefined ? String(cab.costo_delivery) : '',
        costo_instalacion: cab.costo_instalacion !== undefined ? String(cab.costo_instalacion) : '',
        // Countertop
        countertop_material: ct.material || 'Quartz',
        countertop_color: ct.color || '',
        countertop_proveedor: ct.proveedor || '',
        valor_slab: ct.valor_slab !== undefined ? String(ct.valor_slab) : '',
        cantidad_slabs: ct.cantidad_slabs !== undefined ? String(ct.cantidad_slabs) : '',
        sqft_estimados: ct.sqft_estimados !== undefined ? String(ct.sqft_estimados) : '',
        costo_fabricacion: ct.costo_fabricacion !== undefined ? String(ct.costo_fabricacion) : '',
        costo_instalacion: ct.costo_instalacion !== undefined ? String(ct.costo_instalacion) : '',
        costo_transporte: ct.costo_transporte !== undefined ? String(ct.costo_transporte) : ''
      });

      if (Array.isArray(scope.medidas) && scope.medidas.length > 0) {
        setMedidas(scope.medidas);
      }
    }
  }, [projectToEdit]);

  const isKitchenProject = (formData.project_type || '').includes('Cocina');
  const hasCountertopScope = (formData.project_type || '').includes('Cocina') || 
                             (formData.project_type || '').includes('Baños') || 
                             (formData.project_type || '').includes('Remodelación Completa');

  // Real-time calculation of Measurements Table Total SQ FT (Edit mode)
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
      const baseContract = parseFloat(formData.base_contract_value);
      const deposit = parseFloat(formData.deposit_received);

      if (isNaN(baseContract)) {
        throw new Error('Base Contract Value is required and must be a valid number.');
      }

      // Build structured scope details only if in Edit Mode or if user entered them
      let scopeDetails = null;

      if (isEditMode) {
        scopeDetails = {
          cabinets: isKitchenProject ? {
            tipo_construccion: formData.tipo_construccion,
            proveedor: formData.proveedor.trim(),
            linea_modelo: formData.linea_modelo,
            color: formData.color.trim(),
            cantidad_cabinets: Number(formData.cantidad_cabinets) || 0,
            costo_cabinets: Number(formData.costo_cabinets) || 0,
            ensamble: Number(formData.ensamble) || 0,
            costo_hardware: Number(formData.costo_hardware) || 0,
            costo_accesorios: Number(formData.costo_accesorios) || 0,
            costo_delivery: Number(formData.costo_delivery) || 0,
            costo_instalacion: Number(formData.costo_instalacion) || 0,
            total_cabinets_estimado: totalCabinetsCost
          } : null,
          countertops: hasCountertopScope ? {
            material: formData.countertop_material,
            color: formData.countertop_color.trim(),
            proveedor: formData.countertop_proveedor.trim(),
            valor_slab: Number(formData.valor_slab) || 0,
            cantidad_slabs: Number(formData.cantidad_slabs) || 0,
            sqft_estimados: effectiveSqFt,
            costo_fabricacion: Number(formData.costo_fabricacion) || 0,
            costo_instalacion: Number(formData.costo_instalacion) || 0,
            costo_transporte: Number(formData.costo_transporte) || 0,
            total_countertop_estimado: totalCountertopCost
          } : null,
          medidas: hasCountertopScope ? medidas.filter(m => m.area || m.largo || m.profundidad) : []
        };
      }

      const payload = {
        project_name: formData.project_name.trim(),
        client_name: formData.client_name.trim(),
        status: formData.status,
        project_type: formData.project_type,
        base_contract_value: baseContract,
        deposit_received: isNaN(deposit) ? 0 : deposit,
        scope_details: scopeDetails
      };

      if (isEditMode) {
        const targetId = projectToEdit.project_id || projectToEdit.id;
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
      <div className={`modal-content wizard-modal ${!isEditMode ? 'simplified' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>
            {isEditMode ? t('wizard.modalTitleEdit') : t('wizard.modalTitleNew')}
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
          {/* SECTION 1: CORE GENERAL & FINANCIAL INFORMATION (Always Visible) */}
          <div className="wizard-section">
            <div className="wizard-section-title">{t('wizard.secGeneralTitle')}</div>
            
            <div className="wizard-grid-2">
              <div className="form-group">
                <label htmlFor="project_name">{t('wizard.projectNameLabel')}</label>
                <input
                  type="text"
                  id="project_name"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="client_name">{t('wizard.clientNameLabel')}</label>
                <input
                  type="text"
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="wizard-grid-2">
              <div className="form-group">
                <label htmlFor="project_type">{t('wizard.projectTypeLabel')}</label>
                <select
                  id="project_type"
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleChange}
                  required
                >
                  <option value="Cocina">{t('wizard.typeCocina')}</option>
                  <option value="Baños">{t('wizard.typeBanos')}</option>
                  <option value="Cocina y Baños">{t('wizard.typeCocinaBanos')}</option>
                  <option value="Remodelación Completa">{t('wizard.typeRemodelacionCompleta')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">{t('wizard.statusLabel')}</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="Planeación">{t('projectDetails.statusPlaneacion')}</option>
                  <option value="En Ejecución">{t('projectDetails.statusEnEjecucion')}</option>
                  <option value="Pausado">{t('projectDetails.statusPausado')}</option>
                  <option value="Finalizado">{t('projectDetails.statusFinalizado')}</option>
                </select>
              </div>
            </div>

            <div className="wizard-grid-2">
              <div className="form-group">
                <label htmlFor="base_contract_value">{t('wizard.baseContractLabel')}</label>
                <div className="currency-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="base_contract_value"
                    name="base_contract_value"
                    value={formData.base_contract_value}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="deposit_received">{t('wizard.depositLabel')}</label>
                <div className="currency-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="deposit_received"
                    name="deposit_received"
                    value={formData.deposit_received}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CONDITIONAL CABINETS SCOPE (JSONB) - EDIT MODE ONLY */}
          {isEditMode && isKitchenProject && (
            <div className="wizard-section slide-down">
              <div className="wizard-section-title">
                <span>{t('wizard.secCabinetsTitle')}</span>
                <span className="live-cost-badge">
                  {t('wizard.estCabinetsTotal')} <strong>{formatToUSD(totalCabinetsCost)}</strong>
                </span>
              </div>

              <div className="wizard-grid-2">
                <div className="form-group">
                  <label htmlFor="tipo_construccion">{t('wizard.tipoConstruccionLabel')}</label>
                  <input
                    type="text"
                    id="tipo_construccion"
                    name="tipo_construccion"
                    value={formData.tipo_construccion}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="proveedor">{t('wizard.proveedorLabel')}</label>
                  <input
                    type="text"
                    id="proveedor"
                    name="proveedor"
                    value={formData.proveedor}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="linea_modelo">{t('wizard.lineaModeloLabel')}</label>
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
                  <label htmlFor="color">{t('wizard.colorLabel')}</label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cantidad_cabinets">{t('wizard.cantidadCabinetsLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    id="cantidad_cabinets"
                    name="cantidad_cabinets"
                    value={formData.cantidad_cabinets}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="wizard-costs-grid">
                <div className="form-group">
                  <label htmlFor="costo_cabinets">{t('wizard.costoCabinetsLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_cabinets"
                      name="costo_cabinets"
                      value={formData.costo_cabinets}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ensamble">{t('wizard.ensambleLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="ensamble"
                      name="ensamble"
                      value={formData.ensamble}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="costo_hardware">{t('wizard.hardwareLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_hardware"
                      name="costo_hardware"
                      value={formData.costo_hardware}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="costo_accesorios">{t('wizard.accesoriosLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_accesorios"
                      name="costo_accesorios"
                      value={formData.costo_accesorios}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="costo_delivery">{t('wizard.deliveryLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_delivery"
                      name="costo_delivery"
                      value={formData.costo_delivery}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="costo_instalacion">{t('wizard.instalacionLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_instalacion"
                      name="costo_instalacion"
                      value={formData.costo_instalacion}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CONDITIONAL COUNTERTOP SCOPE (JSONB) - EDIT MODE ONLY */}
          {isEditMode && hasCountertopScope && (
            <div className="wizard-section slide-down">
              <div className="wizard-section-title">
                <span>{t('wizard.secCountertopsTitle')}</span>
                <span className="live-cost-badge countertop-badge">
                  {t('wizard.estCountertopTotal')} <strong>{formatToUSD(totalCountertopCost)}</strong>
                </span>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="countertop_material">{t('wizard.materialLabel')}</label>
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
                  <label htmlFor="countertop_color">{t('wizard.colorPatternLabel')}</label>
                  <input
                    type="text"
                    id="countertop_color"
                    name="countertop_color"
                    value={formData.countertop_color}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="countertop_proveedor">{t('wizard.fabricatorLabel')}</label>
                  <input
                    type="text"
                    id="countertop_proveedor"
                    name="countertop_proveedor"
                    value={formData.countertop_proveedor}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="valor_slab">{t('wizard.valorSlabLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="valor_slab"
                      name="valor_slab"
                      value={formData.valor_slab}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cantidad_slabs">{t('wizard.cantidadSlabsLabel')}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    id="cantidad_slabs"
                    name="cantidad_slabs"
                    value={formData.cantidad_slabs}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sqft_estimados">
                    {t('wizard.sqftEstimadosLabel')} {totalMedidasSqFt > 0 && <span style={{ color: '#059669', fontSize: '0.75rem' }}>{t('wizard.autoCalculated')}</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    id="sqft_estimados"
                    name="sqft_estimados"
                    value={totalMedidasSqFt > 0 ? totalMedidasSqFt.toFixed(2) : formData.sqft_estimados}
                    onChange={handleChange}
                    style={totalMedidasSqFt > 0 ? { backgroundColor: '#f0fdf4', fontWeight: 600, borderColor: '#86efac' } : {}}
                  />
                </div>
              </div>

              <div className="wizard-grid-3">
                <div className="form-group">
                  <label htmlFor="costo_fabricacion">{t('wizard.costoFabricacionLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_fabricacion"
                      name="costo_fabricacion"
                      value={formData.costo_fabricacion}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="costo_instalacion">{t('wizard.costoInstalacionLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_instalacion"
                      name="costo_instalacion"
                      value={formData.costo_instalacion}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="costo_transporte">{t('wizard.costoTransporteLabel')}</label>
                  <div className="currency-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="costo_transporte"
                      name="costo_transporte"
                      value={formData.costo_transporte}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* 4. TABLA DE MEDIDAS (MEASUREMENTS TABLE) */}
              <div className="medidas-container">
                <div className="medidas-header">
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>{t('wizard.medidasTitle')}</h4>
                    <small style={{ color: '#64748b' }}>{t('wizard.medidasSubtitle')}</small>
                  </div>
                  <div className="medidas-total-badge">
                    {t('wizard.totalMedidasBadge')} <strong>{totalMedidasSqFt.toFixed(2)} sqft</strong>
                  </div>
                </div>

                <div className="medidas-table-wrapper">
                  <table className="medidas-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40%' }}>{t('wizard.areaHeader')}</th>
                        <th style={{ width: '22%' }}>{t('wizard.lengthHeader')}</th>
                        <th style={{ width: '22%' }}>{t('wizard.depthHeader')}</th>
                        <th style={{ width: '16%' }}>{t('wizard.sqftHeader')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {medidas.map((item, idx) => {
                        const sqft = (parseFloat(item.largo || 0) * parseFloat(item.profundidad || 0)).toFixed(2);
                        return (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="medida-input"
                                value={item.area}
                                onChange={(e) => handleMedidaChange(idx, 'area', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="medida-input"
                                value={item.largo}
                                onChange={(e) => handleMedidaChange(idx, 'largo', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="medida-input"
                                value={item.profundidad}
                                onChange={(e) => handleMedidaChange(idx, 'profundidad', e.target.value)}
                              />
                            </td>
                            <td>
                              <span className="row-sqft-badge">{sqft}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {medidas.length > 1 && (
                                <button
                                  type="button"
                                  className="remove-row-btn"
                                  onClick={() => handleRemoveArea(idx)}
                                  title="Remove Area"
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
                  className="add-row-btn"
                  onClick={handleAddArea}
                >
                  {t('wizard.addAreaBtn')}
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '1.75rem' }}>
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading 
                ? t('common.saving') 
                : (isEditMode ? t('wizard.saveChangesBtn') : t('wizard.createProjectBtn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
