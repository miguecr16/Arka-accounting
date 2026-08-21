import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import './Dashboard.css';

export default function NewExpenseForm({ projectId, onSuccess, onClose, expenseToEdit }) {
  const { t } = useLanguage();
  const isEditMode = !!expenseToEdit;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Materiales');
  const [costAmount, setCostAmount] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState('');

  // Category specific fields (Cabinets)
  const [cabProvider, setCabProvider] = useState('');
  const [cabModel, setCabModel] = useState('');
  const [cabColor, setCabColor] = useState('');
  const [cabQuantity, setCabQuantity] = useState('');

  // Category specific fields (Countertops)
  const [ctMaterial, setCtMaterial] = useState('');
  const [ctProvider, setCtProvider] = useState('');
  const [ctSlabs, setCtSlabs] = useState('');
  const [ctSqft, setCtSqft] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (expenseToEdit) {
      setDate(expenseToEdit.date || new Date().toISOString().split('T')[0]);
      setCategory(expenseToEdit.category || 'Materiales');
      setCostAmount(expenseToEdit.cost_amount !== undefined ? String(expenseToEdit.cost_amount) : '');
      setHoursWorked(expenseToEdit.hours_worked !== undefined ? String(expenseToEdit.hours_worked) : '');
      setExistingReceiptUrl(expenseToEdit.receipt_image_url || '');

      const d = expenseToEdit.details || {};
      if (expenseToEdit.category === 'Cabinets') {
        setCabProvider(d.provider || '');
        setCabModel(d.model || '');
        setCabColor(d.color || '');
        setCabQuantity(d.quantity !== undefined ? String(d.quantity) : '');
      } else if (expenseToEdit.category === 'Countertops') {
        setCtMaterial(d.material || '');
        setCtProvider(d.provider || '');
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
    setLoading(true);
    setError('');

    try {
      let receipt_image_url = existingReceiptUrl;

      // 1. Upload receipt to Supabase Storage if new file selected
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${projectId}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes_arka')
          .upload(filePath, receiptFile);

        if (uploadError) {
          console.warn('Storage upload error:', uploadError.message);
          // Fallback: save filename or keep existing
          receipt_image_url = receiptFile.name;
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('imagenes_arka')
            .getPublicUrl(filePath);

          receipt_image_url = publicUrlData.publicUrl;
        }
      }

      // 2. Build structured details JSONB
      const details = {};
      if (category === 'Cabinets') {
        if (cabProvider) details.provider = cabProvider.trim();
        if (cabModel) details.model = cabModel.trim();
        if (cabColor) details.color = cabColor.trim();
        if (cabQuantity) details.quantity = Number(cabQuantity);
      } else if (category === 'Countertops') {
        if (ctMaterial) details.material = ctMaterial.trim();
        if (ctProvider) details.provider = ctProvider.trim();
        if (ctSlabs) details.slabs = Number(ctSlabs);
        if (ctSqft) details.sqft = Number(ctSqft);
      }

      const cost = parseFloat(costAmount);
      const hours = parseInt(hoursWorked, 10);

      const payload = {
        project_id: projectId,
        date,
        category,
        cost_amount: isNaN(cost) ? 0 : cost,
        hours_worked: isNaN(hours) ? 0 : Math.max(0, hours),
        receipt_image_url,
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
          details: `Actualizó gasto de ${category} ($${payload.cost_amount}, ${payload.hours_worked} hrs) en proyecto ID #${projectId}`
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
          details: `Registró gasto de ${category} ($${payload.cost_amount}, ${payload.hours_worked} hrs) en proyecto ID #${projectId}`
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
      <div className="modal-content">
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
            <label htmlFor="category">{t('expenseForm.categoryLabel')}</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="Materiales">{t('expenseForm.catMateriales')}</option>
              <option value="Mano de Obra">{t('expenseForm.catLabor')}</option>
              <option value="Cabinets">{t('expenseForm.catCabinets')}</option>
              <option value="Countertops">{t('expenseForm.catCountertops')}</option>
              <option value="Subcontratista">{t('expenseForm.catSubcontratista')}</option>
            </select>
          </div>

          {/* Dynamic Specifications for Cabinets */}
          {category === 'Cabinets' && (
            <div className="details-box">
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>{t('expenseForm.cabinetSpecsTitle')}</h4>
              <div className="form-group">
                <label>{t('expenseForm.vendorProviderLabel')}</label>
                <input
                  type="text"
                  value={cabProvider}
                  onChange={(e) => setCabProvider(e.target.value)}
                />
              </div>
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
          )}

          {/* Dynamic Specifications for Countertops */}
          {category === 'Countertops' && (
            <div className="details-box">
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>{t('expenseForm.countertopSpecsTitle')}</h4>
              <div className="form-group">
                <label>{t('expenseForm.materialTypeLabel')}</label>
                <input
                  type="text"
                  value={ctMaterial}
                  onChange={(e) => setCtMaterial(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('expenseForm.fabricatorLabel')}</label>
                <input
                  type="text"
                  value={ctProvider}
                  onChange={(e) => setCtProvider(e.target.value)}
                />
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
          )}

          {/* Hours Input (Strict Natural Integer Only) */}
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
            />
            <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              {t('expenseForm.hoursConstraintMsg')}
            </small>
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

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading 
                ? (isEditMode ? t('expenseForm.updatingRecord') : t('expenseForm.savingRecord')) 
                : (isEditMode ? t('expenseForm.updateRecordBtn') : t('expenseForm.saveRecordBtn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
