import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import { generateInvoicePdf } from '../utils/invoicePdfGenerator.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { FileText, Download, DollarSign, Calendar, Hash, X, Info } from 'lucide-react';
import './Dashboard.css';

export default function InvoiceModal({
  projectData,
  pendingBalance = 0,
  onClose
}) {
  const { t, language } = useLanguage();

  const todayStr = new Date().toISOString().split('T')[0];
  const autoInvNumber = `INV-${Date.now().toString().slice(-4)}`;

  const [invoiceNumber, setInvoiceNumber] = useState(autoInvNumber);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState(
    language === 'es' ? 'Abono / Pago de Proyecto' : 'Progress Payment / Project Billing'
  );
  const [amount, setAmount] = useState(
    pendingBalance > 0 ? String(pendingBalance) : (projectData?.final_contract_value ? String(projectData.final_contract_value) : '0')
  );
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGeneratePdf = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t('invoiceModal.amountError') || 'Please enter a valid billing amount greater than $0.');
      return;
    }

    if (!invoiceNumber.trim()) {
      setError(t('invoiceModal.numberError') || 'Please enter an invoice number.');
      return;
    }

    try {
      setGenerating(true);

      generateInvoicePdf({
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate,
        clientName: projectData?.client_name || '',
        projectName: projectData?.project_name || '',
        description: description.trim(),
        amount: parsedAmount,
        notes: notes.trim(),
        language
      });

      // Audit Log
      await logAuditEvent({
        action: 'Generó Factura',
        entity: 'Factura PDF',
        details: `Generó factura #${invoiceNumber.trim()} por ${formatToUSD(parsedAmount)} para el cliente "${projectData?.client_name}" (Proyecto: "${projectData?.project_name}")`
      });

      onClose();
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '8px', 
              background: '#FBF8F0', 
              color: 'var(--arka-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.2rem', color: 'var(--arka-navy)' }}>
                {t('invoiceModal.title') || 'Generar Factura PDF'}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--arka-text-secondary)' }}>
                {projectData?.client_name} • {projectData?.project_name}
              </p>
            </div>
          </div>

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

        <form onSubmit={handleGeneratePdf} className="expense-form">
          {/* Row 1: Invoice Number & Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label htmlFor="inv-num" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
                {t('invoiceModal.invoiceNumber') || 'Número de Factura'} *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                  <Hash size={15} strokeWidth={1.5} />
                </span>
                <input
                  id="inv-num"
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--arka-border)',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-date" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
                {t('invoiceModal.date') || 'Fecha de Emisión'} *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                  <Calendar size={15} strokeWidth={1.5} />
                </span>
                <input
                  id="inv-date"
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--arka-border)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Description of Billing */}
          <div>
            <label htmlFor="inv-desc" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
              {t('invoiceModal.description') || 'Descripción del Concepto'} *
            </label>
            <input
              id="inv-desc"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('invoiceModal.descPlaceholder') || 'ej. Anticipo 50%, Segundo Pago, Saldo Final...'}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--arka-border)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Row 3: Amount to Bill */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label htmlFor="inv-amount" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)' }}>
                {t('invoiceModal.amount') || 'Monto a Cobrar ($)'} *
              </label>
              {pendingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(pendingBalance))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--arka-gold)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {t('invoiceModal.usePending') || `Usar Saldo Pendiente (${formatToUSD(pendingBalance)})`}
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                <DollarSign size={16} strokeWidth={1.5} />
              </span>
              <input
                id="inv-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 34px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--arka-border)',
                  fontSize: '16px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--arka-navy)'
                }}
              />
            </div>
          </div>

          {/* Row 4: Notes / Instructions (Optional) */}
          <div>
            <label htmlFor="inv-notes" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
              {t('invoiceModal.notes') || 'Instrucciones / Notas de Pago (Opcional)'}
            </label>
            <textarea
              id="inv-notes"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('invoiceModal.notesPlaceholder') || 'ej. Transferencia a Cuenta Bancaria Chase #... / Zelle: info@arkadesign.com'}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--arka-border)',
                fontSize: '13px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              className="cancel-btn"
              disabled={generating}
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
              disabled={generating}
              style={{
                backgroundColor: 'var(--arka-navy)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 20px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(13, 23, 38, 0.15)'
              }}
            >
              <Download size={15} strokeWidth={1.5} />
              <span>{generating ? (t('invoiceModal.generating') || 'Generando...') : (t('invoiceModal.downloadPdf') || 'Descargar Factura PDF')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
