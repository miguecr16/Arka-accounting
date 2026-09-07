import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import { DollarSign, Calendar, FileText, X } from 'lucide-react';
import './Dashboard.css';

export default function NewPaymentModal({ 
  projectId, 
  projectName = '',
  paymentToEdit = null, 
  onClose, 
  onSaved 
}) {
  const { t } = useLanguage();
  const isEditMode = !!paymentToEdit;

  const todayStr = new Date().toISOString().split('T')[0];

  const [amount, setAmount] = useState(paymentToEdit ? String(paymentToEdit.amount) : '');
  const [paymentDate, setPaymentDate] = useState(paymentToEdit ? paymentToEdit.payment_date : todayStr);
  const [description, setDescription] = useState(paymentToEdit ? (paymentToEdit.description || '') : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t('paymentForm.amountError') || 'Please enter a valid positive payment amount.');
      return;
    }

    if (!paymentDate) {
      setError(t('paymentForm.dateError') || 'Please select a valid payment date.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        project_id: projectId,
        amount: parsedAmount,
        payment_date: paymentDate,
        description: description.trim() || null
      };

      if (isEditMode) {
        const { error: updateErr } = await supabase
          .from('project_payments')
          .update(payload)
          .eq('id', paymentToEdit.id);

        if (updateErr) throw updateErr;

        await logAuditEvent({
          action: 'Actualizó',
          entity: 'Abono',
          details: `Actualizó abono a ${formatToUSD(parsedAmount)} (${description.trim() || 'Sin descripción'}) en proyecto "${projectName || projectId}"`
        });
      } else {
        const { error: insertErr } = await supabase
          .from('project_payments')
          .insert([payload]);

        if (insertErr) throw insertErr;

        await logAuditEvent({
          action: 'Registró',
          entity: 'Abono',
          details: `Registró abono de ${formatToUSD(parsedAmount)} (${description.trim() || 'Sin descripción'}) en proyecto "${projectName || projectId}"`
        });
      }

      onSaved();
    } catch (err) {
      console.error('Error saving payment:', err);
      setError(err.message || 'Failed to save payment record. Check database permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.25rem', color: 'var(--arka-navy)' }}>
            {isEditMode ? t('paymentForm.modalTitleEdit') : t('paymentForm.modalTitleNew')}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--arka-text-secondary)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px'
            }}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-form">
          {/* Amount Field */}
          <div>
            <label htmlFor="payment-amount" style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '6px' }}>
              {t('paymentForm.amountLabel')} *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex', alignItems: 'center' }}>
                <DollarSign size={16} strokeWidth={1.5} />
              </span>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--arka-border)',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)'
                }}
              />
            </div>
          </div>

          {/* Payment Date Field */}
          <div>
            <label htmlFor="payment-date" style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '6px' }}>
              {t('paymentForm.dateLabel')} *
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex', alignItems: 'center' }}>
                <Calendar size={16} strokeWidth={1.5} />
              </span>
              <input
                id="payment-date"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--arka-border)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="payment-description" style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '6px' }}>
              {t('paymentForm.descriptionLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--arka-text-secondary)', display: 'flex', alignItems: 'center' }}>
                <FileText size={16} strokeWidth={1.5} />
              </span>
              <textarea
                id="payment-description"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('paymentForm.descriptionPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--arka-border)',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              className="cancel-btn"
              disabled={loading}
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--arka-border)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px'
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: 'var(--arka-navy)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading 
                ? t('paymentForm.saving') 
                : (isEditMode ? t('paymentForm.updateBtn') : t('paymentForm.saveBtn'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
