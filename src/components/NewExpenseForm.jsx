import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import './Dashboard.css';

export default function NewExpenseForm({ projectId, onSuccess, onClose, expenseToEdit }) {
  const { t } = useLanguage();
  const isEditMode = !!expenseToEdit;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(expenseToEdit ? expenseToEdit.category : '');
  const [costAmount, setCostAmount] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState('');

  // Category specific fields (Cabinets)
  const [cabModel, setCabModel] = useState('');
  const [cabColor, setCabColor] = useState('');
  const [cabQuantity, setCabQuantity] = useState('');

  // Category specific fields (Countertops)
  const [ctMaterial, setCtMaterial] = useState('Quartz');
  const [ctSlabs, setCtSlabs] = useState('');
  const [ctSqft, setCtSqft] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (expenseToEdit) {
      setDate(expenseToEdit.date || new Date().toISOString().split('T')[0]);
      setCategory(expenseToEdit.category || '');
      setCostAmount(expenseToEdit.cost_amount !== undefined ? String(expenseToEdit.cost_amount) : '');
      setHoursWorked(expenseToEdit.hours_worked !== undefined ? String(expenseToEdit.hours_worked) : '');
      setProveedor(expenseToEdit.proveedor || expenseToEdit.details?.provider || '');
      setDescripcion(expenseToEdit.descripcion || '');
      setExistingReceiptUrl(expenseToEdit.receipt_image_url || '');

      const d = expenseToEdit.details || {};
      if (expenseToEdit.category === 'Cabinets') {
        setCabModel(d.model || '');
        setCabColor(d.color || '');
        setCabQuantity(d.quantity !== undefined ? String(d.quantity) : '');
      } else if (expenseToEdit.category === 'Countertops') {
        setCtMaterial(d.material || 'Quartz');
        setCtSlabs(d.slabs !== undefined ? String(d.slabs) : '');
        setCtSqft(d.sqft !== undefined ? String(d.sqft) : '');
      }
    }
  }, [expenseToEdit]);

  const handleHoursChange = (e) => {
    const rawVal = e.target.value;
    // Strictly positive natural whole integers (1, 2, 8, 40...)
    if (rawVal === '') {
      setHoursWorked('');
      return;
    }
    const cleanInt = rawVal.replace(/[^0-9]/g, '');
    setHoursWorked(cleanInt);
  };

  const handleHoursKeyDown = (e) => {
    // Block dots, commas, 'e', signs (+, -)
    if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) {
      setError('Please select a category first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let receipt_image_url = existingReceiptUrl;

      // 1. Upload receipt to Supabase Storage and retrieve FULL public URL
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const cleanExt = fileExt ? fileExt.toLowerCase() : 'jpg';
        const fileName = `${projectId}_${Date.now()}.${cleanExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes_arka')
          .upload(filePath, receiptFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Receipt upload failed: ${uploadError.message}`);
        }

        // Get FULL public URL
        const { data: publicUrlData } = supabase.storage
          .from('imagenes_arka')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Could not retrieve public URL for uploaded receipt.');
        }

        receipt_image_url = publicUrlData.publicUrl;
      }

      // 2. Build structured details JSONB
      const details = {};
      if (category === 'Cabinets') {
        if (proveedor) details.provider = proveedor.trim();
        if (cabModel) details.model = cabModel.trim();
        if (cabColor) details.color = cabColor.trim();
        if (cabQuantity) details.quantity = Number(cabQuantity);
      } else if (category === 'Countertops') {
        if (ctMaterial) details.material = ctMaterial.trim();
        if (proveedor) details.provider = proveedor.trim();
        if (ctSlabs) details.slabs = Number(ctSlabs);
        if (ctSqft) details.sqft = Number(ctSqft);
      }

      const cost = parseFloat(costAmount);
      const hours = parseInt(hoursWorked, 10);

      const payload = {
        project_id: projectId,
        date,
        category,
        proveedor: proveedor.trim() || null,
        descripcion: descripcion.trim() || null,
        cost_amount: isNaN(cost) ? 0 : cost,
        hours_worked: isNaN(hours) ? 0 : Math.max(0, hours),
        receipt_image_url: receipt_image_url || null,
        details: Object.keys(details).length > 0 ? details : null
      };

      if (isEditMode) {
        const { error: dbError } = await supabase
          .from('expenses_and_hours')
          .update(payload)
          .eq('id', expenseToEdit.id);

        if (dbError) throw dbError;

        // Log audit event for expense edit
        await logAuditEvent({
          action: 'Editó',
          entity: 'Gasto',
          details: `Actualizó ${category} ($${payload.cost_amount}, ${payload.hours_worked} hrs${payload.proveedor ? ', Proveedor: ' + payload.proveedor : ''}) en proyecto ID #${projectId}`
        });
      } else {
        const { error: dbError } = await supabase
          .from('expenses_and_hours')
          .insert([payload]);

        if (dbError) throw dbError;

        // Log audit event for expense creation
        await logAuditEvent({
          action: 'Creó',
          entity: 'Gasto',
          details: `Registró ${category} ($${payload.cost_amount}, ${payload.hours_worked} hrs${payload.proveedor ? ', Proveedor: ' + payload.proveedor : ''}) en proyecto ID #${projectId}`
        });
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err.message || 'Failed to save expense/hours record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: category ? '560px' : '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.35rem' }}>
            {isEditMode ? t('expenseForm.modalTitleEdit') : t('expenseForm.modalTitleNew')}
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
          {/* STEP 1: CATEGORY SELECTION (ALWAYS SHOWN) */}
          <div className="form-group">
            <label htmlFor="category">{t('expenseForm.categoryLabel')}</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              autoFocus={!category}
            >
              <option value="" disabled>{t('expenseForm.selectCategoryPrompt')}</option>
              <option value="Mano de Obra">{t('expenseForm.catLabor')}</option>
              <option value="Materiales">{t('expenseForm.catMateriales')}</option>
              <option value="Cabinets">{t('expenseForm.catCabinets')}</option>
              <option value="Countertops">{t('expenseForm.catCountertops')}</option>
              <option value="Subcontratista">{t('expenseForm.catSubcontratista')}</option>
            </select>
          </div>

          {/* STEP 2: CONDITIONAL REVELATION BASED ON SELECTED CATEGORY */}

          {/* A. MANO DE OBRA (LABOR) */}
          {category === 'Mano de Obra' && (
            <div className="wizard-section slide-down" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="worker_name">{t('expenseForm.workerNameLabel')}</label>
                <input
                  type="text"
                  id="worker_name"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">{t('expenseForm.dateLabel')}</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="hours_worked">
                  {t('expenseForm.hoursWorkedLabel')} <small style={{ color: '#64748b' }}>{t('expenseForm.wholeNumbersOnly')}</small>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  id="hours_worked"
                  value={hoursWorked}
                  onChange={handleHoursChange}
                  onKeyDown={handleHoursKeyDown}
                  required
                />
                <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {t('expenseForm.hoursConstraintMsg')}
                </small>
              </div>
            </div>
          )}

          {/* B. MATERIALES */}
          {category === 'Materiales' && (
            <div className="wizard-section slide-down" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="proveedor">{t('expenseForm.proveedorLabel')}</label>
                <input
                  type="text"
                  id="proveedor"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">{t('expenseForm.materialDescriptionLabel')}</label>
                <input
                  type="text"
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">{t('expenseForm.dateLabel')}</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cost_amount">{t('expenseForm.totalCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="cost_amount"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt">
                  {t('expenseForm.receiptImageLabel')} {existingReceiptUrl && <small style={{ color: '#059669' }}>{t('expenseForm.currentAttached')}</small>}
                </label>
                <input
                  type="file"
                  id="receipt"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                />
                <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                  {existingReceiptUrl 
                    ? t('expenseForm.receiptExistingHint')
                    : t('expenseForm.receiptNewHint')}
                </small>
              </div>
            </div>
          )}

          {/* C. CABINETS */}
          {category === 'Cabinets' && (
            <div className="wizard-section slide-down" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="proveedor">{t('expenseForm.proveedorLabel')}</label>
                <input
                  type="text"
                  id="proveedor"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">{t('expenseForm.materialDescriptionLabel')}</label>
                <input
                  type="text"
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="details-box">
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>{t('expenseForm.cabinetSpecsTitle')}</h4>
                <div className="form-group">
                  <label>{t('expenseForm.lineModelLabel')}</label>
                  <input
                    type="text"
                    value={cabModel}
                    onChange={(e) => setCabModel(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('expenseForm.finishColorLabel')}</label>
                  <input
                    type="text"
                    value={cabColor}
                    onChange={(e) => setCabColor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('expenseForm.quantityUnitsLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={cabQuantity}
                    onChange={(e) => setCabQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="date">{t('expenseForm.dateLabel')}</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cost_amount">{t('expenseForm.totalCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="cost_amount"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt">
                  {t('expenseForm.receiptImageLabel')} {existingReceiptUrl && <small style={{ color: '#059669' }}>{t('expenseForm.currentAttached')}</small>}
                </label>
                <input
                  type="file"
                  id="receipt"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                />
              </div>
            </div>
          )}

          {/* D. COUNTERTOPS */}
          {category === 'Countertops' && (
            <div className="wizard-section slide-down" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="proveedor">{t('expenseForm.fabricatorLabel')}</label>
                <input
                  type="text"
                  id="proveedor"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">{t('expenseForm.materialDescriptionLabel')}</label>
                <input
                  type="text"
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="details-box">
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>{t('expenseForm.countertopSpecsTitle')}</h4>
                <div className="form-group">
                  <label>{t('expenseForm.materialTypeLabel')}</label>
                  <select
                    value={ctMaterial}
                    onChange={(e) => setCtMaterial(e.target.value)}
                  >
                    <option value="Quartz">Quartz</option>
                    <option value="Granite">Granite</option>
                    <option value="Quartzite">Quartzite</option>
                    <option value="Porcelain">Porcelain</option>
                    <option value="Marble">Marble</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('expenseForm.slabsCountLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={ctSlabs}
                    onChange={(e) => setCtSlabs(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t('expenseForm.sqftLabel')}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={ctSqft}
                    onChange={(e) => setCtSqft(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="date">{t('expenseForm.dateLabel')}</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cost_amount">{t('expenseForm.totalCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="cost_amount"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt">
                  {t('expenseForm.receiptImageLabel')} {existingReceiptUrl && <small style={{ color: '#059669' }}>{t('expenseForm.currentAttached')}</small>}
                </label>
                <input
                  type="file"
                  id="receipt"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                />
              </div>
            </div>
          )}

          {/* E. SUBCONTRATISTA / GENERAL */}
          {category === 'Subcontratista' && (
            <div className="wizard-section slide-down" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="proveedor">{t('expenseForm.proveedorLabel')}</label>
                <input
                  type="text"
                  id="proveedor"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">{t('expenseForm.materialDescriptionLabel')}</label>
                <input
                  type="text"
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="date">{t('expenseForm.dateLabel')}</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cost_amount">{t('expenseForm.totalCostLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="cost_amount"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="receipt">
                  {t('expenseForm.receiptImageLabel')} {existingReceiptUrl && <small style={{ color: '#059669' }}>{t('expenseForm.currentAttached')}</small>}
                </label>
                <input
                  type="file"
                  id="receipt"
                  accept="image/*"
                  onChange={(e) => setReceiptFile(e.target.files[0] || null)}
                />
              </div>
            </div>
          )}

          {/* MODAL ACTIONS - ENABLED ONCE CATEGORY IS CHOSEN */}
          {category && (
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="cancel-btn" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading 
                  ? (isEditMode ? t('expenseForm.updatingRecord') : t('expenseForm.savingRecord')) 
                  : (isEditMode ? t('expenseForm.updateRecordBtn') : t('expenseForm.saveRecordBtn'))}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
