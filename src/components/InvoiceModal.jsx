import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import { generateInvoicePdf } from '../utils/invoicePdfGenerator.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { 
  FileText, 
  Download, 
  Plus, 
  Trash2, 
  Calendar, 
  Hash, 
  X, 
  Clock, 
  CreditCard,
  DollarSign
} from 'lucide-react';
import './Dashboard.css';

export default function InvoiceModal({
  projectData,
  pendingBalance = 0,
  totalCollected = 0,
  onClose
}) {
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  const autoInvNumber = `INV-${Date.now().toString().slice(-4)}`;

  const [invoiceNumber, setInvoiceNumber] = useState(autoInvNumber);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  // Initial line item default
  const initialRate = pendingBalance > 0 
    ? pendingBalance 
    : (projectData?.final_contract_value ? Number(projectData.final_contract_value) : 1000);

  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      item: isSpanish ? 'Servicios' : 'Services',
      description: isSpanish ? 'Instalación de gabinetes de cocina' : 'Kitchen cabinets installation',
      qty: 1,
      rate: initialRate,
      amount: initialRate
    }
  ]);

  // Payments applied state
  const [deductPayments, setDeductPayments] = useState(false);
  const [customPaymentsApplied, setCustomPaymentsApplied] = useState(totalCollected > 0 ? totalCollected : 0);

  const [notes, setNotes] = useState(
    isSpanish 
      ? 'Gracias por su preferencia. Por favor realizar el pago dentro de los 15 días posteriores a la emisión.'
      : 'Thank you for your business. Please make payments within 15 days of invoice date.'
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Dynamic calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  }, [lineItems]);

  const total = subtotal;

  const appliedDeduction = deductPayments ? (parseFloat(customPaymentsApplied) || 0) : 0;
  const balanceDue = Math.max(0, total - appliedDeduction);

  const handleLineItemChange = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      
      if (field === 'qty' || field === 'rate') {
        const q = field === 'qty' ? (parseFloat(value) || 0) : (parseFloat(item.qty) || 0);
        const r = field === 'rate' ? (parseFloat(value) || 0) : (parseFloat(item.rate) || 0);
        updated.amount = Math.round(q * r * 100) / 100;
      }
      return updated;
    }));
  };

  const handleAddLine = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: Date.now(),
        item: '',
        description: '',
        qty: 1,
        rate: 0,
        amount: 0
      }
    ]);
  };

  const handleRemoveLine = (id) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handleGeneratePdf = async (e) => {
    e.preventDefault();
    setError('');

    if (!invoiceNumber.trim()) {
      setError(t('invoiceModal.numberError') || 'Please enter an invoice number.');
      return;
    }

    const validLines = lineItems.filter(item => item.item.trim() && (parseFloat(item.amount) || 0) > 0);
    if (validLines.length === 0) {
      setError(t('invoiceModal.lineItemsRequired') || 'Please ensure at least one line item has a valid name and amount.');
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
        lineItems: validLines,
        subtotal,
        total,
        paymentsApplied: appliedDeduction,
        balanceDue,
        notes: notes.trim(),
        language
      });

      // Audit Log
      await logAuditEvent({
        action: 'Generó Factura',
        entity: 'Factura PDF',
        details: `Generó factura #${invoiceNumber.trim()} (Subtotal: ${formatToUSD(subtotal)}, Saldo: ${formatToUSD(balanceDue)}) para el cliente "${projectData?.client_name}" (Proyecto: "${projectData?.project_name}")`
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
        style={{ 
          maxWidth: '780px', 
          width: '95vw', 
          maxHeight: '90vh', 
          overflowY: 'auto',
          padding: '24px 28px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--arka-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              background: '#FBF8F0', 
              color: 'var(--arka-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(180, 140, 60, 0.15)'
            }}>
              <FileText size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.35rem', color: 'var(--arka-navy)', letterSpacing: '-0.01em' }}>
                {t('invoiceModal.title') || 'Generar Factura PDF'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--arka-text-secondary)' }}>
                <span style={{ fontWeight: 600, color: 'var(--arka-navy)' }}>{projectData?.client_name || 'Client'}</span> • {projectData?.project_name}
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--arka-text-secondary)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px'
            }}
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: '18px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleGeneratePdf}>
          {/* Metadata Grid (Invoice #, Date, Due Date) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', 
            gap: '14px',
            background: 'var(--arka-bg-subtle, #f8fafc)',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            border: '1px solid var(--arka-border)'
          }}>
            {/* Invoice # */}
            <div>
              <label htmlFor="inv-num" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
                {t('invoiceModal.invoiceNumber') || 'Número de Factura'} *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                  <Hash size={14} strokeWidth={1.5} />
                </span>
                <input
                  id="inv-num"
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 28px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--arka-border)',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            {/* Issue Date */}
            <div>
              <label htmlFor="inv-date" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
                {t('invoiceModal.date') || 'Fecha de Emisión'} *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                  <Calendar size={14} strokeWidth={1.5} />
                </span>
                <input
                  id="inv-date"
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 28px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--arka-border)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="inv-due" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
                {t('invoiceModal.dueDate') || 'Fecha de Vencimiento'}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                  <Clock size={14} strokeWidth={1.5} />
                </span>
                <input
                  id="inv-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 28px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--arka-border)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Line Items Section (QuickBooks Style) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--arka-navy)', letterSpacing: '0.04em' }}>
                {t('invoiceModal.lineItemsTitle') || 'Líneas y Conceptos Facturables'}
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                style={{
                  background: 'none',
                  border: '1px dashed var(--arka-gold)',
                  color: 'var(--arka-gold)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} strokeWidth={2} />
                <span>{t('invoiceModal.addLineBtn') || '+ Añadir Línea'}</span>
              </button>
            </div>

            {/* Line Items Table */}
            <div style={{ 
              border: '1px solid var(--arka-border)', 
              borderRadius: 'var(--radius-md)', 
              overflow: 'hidden'
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 1.3fr) minmax(160px, 1.8fr) 70px 100px 110px 36px',
                gap: '8px',
                background: 'var(--arka-navy)',
                color: '#ffffff',
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                <div>{t('invoiceModal.itemCol') || 'Ítem / Servicio'} *</div>
                <div>{t('invoiceModal.descCol') || 'Descripción'}</div>
                <div style={{ textAlign: 'right' }}>{t('invoiceModal.qtyCol') || 'Cant'}</div>
                <div style={{ textAlign: 'right' }}>{t('invoiceModal.rateCol') || 'Precio ($)'}</div>
                <div style={{ textAlign: 'right' }}>{t('invoiceModal.amountCol') || 'Monto ($)'}</div>
                <div></div>
              </div>

              {/* Rows */}
              <div style={{ background: '#ffffff' }}>
                {lineItems.map((item, idx) => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(140px, 1.3fr) minmax(160px, 1.8fr) 70px 100px 110px 36px',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: idx < lineItems.length - 1 ? '1px solid var(--arka-border)' : 'none',
                      background: idx % 2 === 1 ? '#fcfcfd' : '#ffffff'
                    }}
                  >
                    {/* Item Name */}
                    <div>
                      <input
                        type="text"
                        required
                        placeholder={t('invoiceModal.itemPlaceholder') || 'ej. Demolición, Carpintería'}
                        value={item.item}
                        onChange={(e) => handleLineItemChange(item.id, 'item', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--arka-border)',
                          fontSize: '12.5px',
                          fontWeight: 500
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <input
                        type="text"
                        placeholder={t('invoiceModal.descPlaceholder') || 'Detalles o especificaciones'}
                        value={item.description}
                        onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--arka-border)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    {/* Qty */}
                    <div>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={item.qty}
                        onChange={(e) => handleLineItemChange(item.id, 'qty', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--arka-border)',
                          fontSize: '12.5px',
                          textAlign: 'right'
                        }}
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.rate}
                        onChange={(e) => handleLineItemChange(item.id, 'rate', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--arka-border)',
                          fontSize: '12.5px',
                          textAlign: 'right'
                        }}
                      />
                    </div>

                    {/* Amount (Computed) */}
                    <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '13px', color: 'var(--arka-navy)', paddingRight: '4px' }}>
                      {formatToUSD(item.amount)}
                    </div>

                    {/* Delete button */}
                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(item.id)}
                        disabled={lineItems.length <= 1}
                        title={t('invoiceModal.removeLine') || 'Eliminar'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: lineItems.length <= 1 ? '#cbd5e1' : '#ef4444',
                          cursor: lineItems.length <= 1 ? 'not-allowed' : 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Grid: Terms/Notes (Left) & Totals Summary (Right) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(240px, 1.3fr) minmax(260px, 1fr)', 
            gap: '20px',
            alignItems: 'start',
            marginBottom: '20px'
          }}>
            {/* Left: Payments Applied Toggle + Terms/Notes */}
            <div>
              {/* Payments Applied Option */}
              <div style={{
                background: 'var(--arka-bg-subtle, #f8fafc)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--arka-border)',
                marginBottom: '12px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: 'var(--arka-navy)' }}>
                  <input
                    type="checkbox"
                    checked={deductPayments}
                    onChange={(e) => setDeductPayments(e.target.checked)}
                    style={{ accentColor: 'var(--arka-gold)', width: '15px', height: '15px' }}
                  />
                  <span>{t('invoiceModal.paymentsAppliedToggle') || 'Descontar abonos recaudados del proyecto:'}</span>
                </label>

                {deductPayments && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--arka-text-secondary)' }}>Monto:</span>
                    <div style={{ position: 'relative', width: '140px' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--arka-text-secondary)', display: 'flex' }}>
                        <DollarSign size={13} strokeWidth={1.5} />
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={customPaymentsApplied}
                        onChange={(e) => setCustomPaymentsApplied(parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '4px 6px 4px 22px',
                          borderRadius: '4px',
                          border: '1px solid var(--arka-border)',
                          fontSize: '12.5px',
                          fontWeight: 600
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Terms & Notes */}
              <div>
                <label htmlFor="inv-notes" style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--arka-text-secondary)', marginBottom: '5px' }}>
                  {t('invoiceModal.termsNotesTitle') || 'Términos y Notas de Pago'}
                </label>
                <textarea
                  id="inv-notes"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('invoiceModal.termsNotesPlaceholder') || 'Instrucciones bancarias, condiciones de pago...'}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--arka-border)',
                    fontSize: '12px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Right: Live Financial Summary Box */}
            <div style={{
              background: '#ffffff',
              border: '1px solid var(--arka-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--arka-text-secondary)' }}>{t('invoiceModal.subtotal') || 'Subtotal:'}</span>
                <span style={{ fontWeight: 600, color: 'var(--arka-navy)' }}>{formatToUSD(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--arka-text-secondary)' }}>{t('invoiceModal.total') || 'Total Factura:'}</span>
                <span style={{ fontWeight: 700, color: 'var(--arka-navy)' }}>{formatToUSD(total)}</span>
              </div>

              {deductPayments && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#10b981' }}>
                  <span>{t('invoiceModal.paymentsApplied') || 'Abonos Aplicados:'}</span>
                  <span style={{ fontWeight: 600 }}>-{formatToUSD(appliedDeduction)}</span>
                </div>
              )}

              {/* Balance Due Card */}
              <div style={{
                marginTop: '12px',
                padding: '12px 14px',
                background: 'var(--arka-navy)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 3px 8px rgba(13, 23, 38, 0.2)'
              }}>
                <div>
                  <div style={{ color: 'var(--arka-gold)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {t('invoiceModal.balanceDue') || 'SALDO A PAGAR:'}
                  </div>
                </div>
                <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {formatToUSD(balanceDue)}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--arka-border)', paddingTop: '16px' }}>
            <button
              type="button"
              className="cancel-btn"
              disabled={generating}
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--arka-border)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13.5px'
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
                padding: '9px 22px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: generating ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 8px rgba(13, 23, 38, 0.2)'
              }}
            >
              <Download size={16} strokeWidth={1.75} />
              <span>{generating ? (t('invoiceModal.generating') || 'Generando...') : (t('invoiceModal.downloadPdf') || 'Descargar Factura PDF')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
