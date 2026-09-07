import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import NewExpenseForm from './NewExpenseForm.jsx';
import NewChangeOrderModal from './NewChangeOrderModal.jsx';
import NewPaymentModal from './NewPaymentModal.jsx';
import { 
  ArrowLeft, 
  Trash2, 
  Receipt, 
  FileText, 
  Pencil, 
  Check, 
  PlusCircle, 
  Info, 
  AlertTriangle, 
  X, 
  User,
  Coins
} from 'lucide-react';
import './ProjectDetails.css';

export default function ProjectDetails({ projectId, onBack, userRole = 'trabajador' }) {
  const { t, language } = useLanguage();
  const isAdmin = userRole === 'admin';

  const [projectData, setProjectData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'change_orders' | 'payments'
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState(null); // Lightbox image state
  const [error, setError] = useState('');
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [isChangeOrderModalOpen, setIsChangeOrderModalOpen] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const resolveSingleUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
    const clean = rawUrl.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    // Handle legacy raw filename stored previously
    return `https://ddenuevupwywvatplfnt.supabase.co/storage/v1/object/public/imagenes_arka/${clean}`;
  };

  const resolveReceiptUrls = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(resolveSingleUrl).filter(Boolean);
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map(resolveSingleUrl).filter(Boolean);
          }
        } catch (e) {
          // fallback to single url
        }
      }
      const single = resolveSingleUrl(trimmed);
      return single ? [single] : [];
    }
    return [];
  };

  const isPdfUrl = (url) => {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return clean.endsWith('.pdf');
  };

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedReceiptImage) {
        setSelectedReceiptImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReceiptImage]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch financial KPI view for this specific project
      const { data: viewData, error: viewError } = await supabase
        .from('projects_dashboard_view')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (viewError) throw viewError;
      setProjectData(viewData);

      // 2. Fetch all expenses & hours history for this project
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses_and_hours')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      if (expenseError) throw expenseError;
      setExpenses(expenseData || []);

      // 3. Fetch change orders, payments, and deposit for this project (if admin)
      if (isAdmin) {
        const [coRes, payRes, projRes] = await Promise.all([
          supabase
            .from('change_orders')
            .select('*')
            .eq('project_id', projectId)
            .order('id', { ascending: false }),
          supabase
            .from('project_payments')
            .select('*')
            .eq('project_id', projectId)
            .order('payment_date', { ascending: false })
            .order('id', { ascending: false }),
          supabase
            .from('projects')
            .select('deposit_received')
            .eq('id', projectId)
            .single()
        ]);

        if (coRes.error) console.error('Error fetching change orders:', coRes.error);
        setChangeOrders(coRes.data || []);

        if (payRes.error) console.warn('Error fetching project_payments:', payRes.error);
        setPayments(payRes.data || []);

        if (!projRes.error && projRes.data) {
          setProjectData(prev => ({
            ...prev,
            deposit_received: projRes.data.deposit_received
          }));
        }
      }

    } catch (err) {
      console.error('Error fetching project details:', err);
      setError('Could not load project details. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAllData();
    }
  }, [projectId, isAdmin]);

  // Handle live project status change (Admin only)
  const handleStatusChange = async (newStatus) => {
    if (!isAdmin) return;

    try {
      setStatusUpdating(true);
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (updateError) throw updateError;

      // Log audit event for status change
      await logAuditEvent({
        action: 'Actualizó Estado',
        entity: 'Proyecto',
        details: `Cambió estado a "${newStatus}" en proyecto "${projectData?.project_name || projectId}"`
      });

      setProjectData((prev) => (prev ? { ...prev, status: newStatus } : prev));
      await fetchAllData();
    } catch (err) {
      console.error('Error updating project status:', err);
      alert('Failed to update status: ' + (err.message || 'Unknown error'));
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle Admin Project Deletion
  const handleDeleteProject = async () => {
    if (!isAdmin) return;

    try {
      setIsDeleting(true);
      const projName = projectData?.project_name || `#${projectId}`;

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) throw deleteError;

      // Log audit event for Project Deletion
      await logAuditEvent({
        action: 'Eliminó',
        entity: 'Proyecto',
        details: `Eliminó el proyecto "${projName}" (ID: ${projectId}) y sus registros asociados.`
      });

      setIsDeleteModalOpen(false);
      onBack();
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project: ' + (err.message || 'Unknown error'));
      setIsDeleting(false);
    }
  };

  // Handle Delete Single Expense/Record
  const handleDeleteExpense = async (expense) => {
    if (!isAdmin) return;

    const confirmMsg = language === 'es'
      ? '¿Estás seguro de que deseas eliminar este registro?'
      : 'Are you sure you want to delete this expense record?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoadingId(expense.id);

      const { error: delError } = await supabase
        .from('expenses_and_hours')
        .delete()
        .eq('id', expense.id);

      if (delError) throw delError;

      // Log audit event
      await logAuditEvent({
        action: 'Eliminó',
        entity: 'Gasto/Horas',
        details: `Eliminó registro categoría "${expense.category}" (${expense.date}) en proyecto "${projectData?.project_name || projectId}"`
      });

      await fetchAllData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Error deleting expense: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Single Payment (Admin only)
  const handleDeletePayment = async (payment) => {
    if (!isAdmin) return;

    const confirmMsg = t('projectDetails.deletePaymentConfirm') || '¿Estás seguro de que deseas eliminar este registro de abono?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoadingId(payment.id);

      const { error: delError } = await supabase
        .from('project_payments')
        .delete()
        .eq('id', payment.id);

      if (delError) throw delError;

      await logAuditEvent({
        action: 'Eliminó',
        entity: 'Abono',
        details: `Eliminó abono por ${formatToUSD(payment.amount)} (${payment.payment_date}) en proyecto "${projectData?.project_name || projectId}"`
      });

      await fetchAllData();
    } catch (err) {
      console.error('Error deleting payment:', err);
      alert('Error deleting payment: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Change Order Approval (Admin only)
  const handleApproveChangeOrder = async (changeOrderId, description, extraCharge) => {
    if (!isAdmin) return;

    try {
      setActionLoadingId(changeOrderId);

      const { error: updateError } = await supabase
        .from('change_orders')
        .update({ status: 'Aprobado' })
        .eq('id', changeOrderId);

      if (updateError) throw updateError;

      // Log audit event for Change Order Approval
      await logAuditEvent({
        action: 'Aprobó',
        entity: 'Orden de Cambio',
        details: `Aprobó orden de cambio "${description}" (+${formatToUSD(extraCharge)}) en proyecto "${projectData?.project_name || projectId}"`
      });

      await fetchAllData();
    } catch (err) {
      console.error('Error approving change order:', err);
      alert('Failed to approve change order: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const getProjectStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('ejecución') || s.includes('ejecucion') || s.includes('progress')) return 'en-ejecucion';
    if (s.includes('pausado') || s.includes('paused')) return 'pausado';
    if (s.includes('finalizado') || s.includes('completed') || s.includes('terminado')) return 'finalizado';
    return 'planeacion';
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'aprobado' || s === 'approved') return 'aprobado';
    if (s === 'rechazado' || s === 'rejected') return 'rechazado';
    return 'borrador';
  };

  const renderExpenseDetails = (item) => {
    const d = item.details;
    const hasProveedor = item.proveedor && item.proveedor.trim();
    const hasDescripcion = item.descripcion && item.descripcion.trim();

    if (item.category === 'Mano de Obra') {
      const workerName = hasDescripcion || d?.worker_name || hasProveedor;
      return (
        <div style={{ fontSize: '0.85rem', color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          {workerName ? (
            <>
              <User size={13} strokeWidth={1.5} style={{ color: '#64748b' }} />
              <strong>{workerName}</strong>
            </>
          ) : (
            <span style={{ color: '#64748b' }}>-</span>
          )}
        </div>
      );
    }

    if (item.category === 'Materiales' || item.category === 'Otros gastos') {
      return (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {hasProveedor && <strong>{item.proveedor} </strong>}
          {hasProveedor && hasDescripcion && <span>• </span>}
          {hasDescripcion && <span style={{ color: '#475569' }}>{item.descripcion}</span>}
          {!hasProveedor && !hasDescripcion && <span style={{ color: '#9ca3af' }}>-</span>}
        </div>
      );
    }

    if (item.category === 'Cabinets') {
      return (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {hasProveedor ? <strong>{item.proveedor} </strong> : (d?.provider && <strong>{d.provider} </strong>)}
          {hasDescripcion && <span style={{ color: '#475569' }}>• {item.descripcion} </span>}
          {d?.model && <span>• {d.model} </span>}
          {d?.color && <span style={{ color: '#4b5563' }}>({d.color}) </span>}
          {d?.quantity && <span className="detail-pill">{d.quantity} units</span>}
        </div>
      );
    }

    if (item.category === 'Countertops') {
      return (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {d?.material && <strong>{d.material} </strong>}
          {hasProveedor ? <span style={{ color: '#4b5563' }}>({item.proveedor}) </span> : (d?.provider && <span style={{ color: '#4b5563' }}>({d.provider}) </span>)}
          {hasDescripcion && <span style={{ color: '#475569' }}>• {item.descripcion} </span>}
          {(d?.slabs || d?.sqft) && (
            <span className="detail-pill">
              {d.slabs ? `${d.slabs} slabs` : ''}
              {d.slabs && d.sqft ? ' • ' : ''}
              {d.sqft ? `${d.sqft} sqft` : ''}
            </span>
          )}
        </div>
      );
    }

    // Generic fallback (Subcontratista, etc.)
    if (hasProveedor || hasDescripcion) {
      return (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {hasProveedor && <strong>{item.proveedor} </strong>}
          {hasProveedor && hasDescripcion && <span>• </span>}
          {hasDescripcion && <span style={{ color: '#475569' }}>{item.descripcion}</span>}
        </div>
      );
    }

    if (d && typeof d === 'object' && Object.keys(d).length > 0) {
      return (
        <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
          {Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' • ')}
        </div>
      );
    }

    return <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>-</span>;
  };

  if (loading && !projectData) {
    return (
      <div className="project-details-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error && !projectData) {
    return (
      <div className="project-details-container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t('common.backToDashboard')}</span>
        </button>
        <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>
      </div>
    );
  }

  const currentStatus = projectData?.status || 'Planeación';

  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const depositReceived = parseFloat(projectData?.deposit_received) || 0;
  const totalCollected = depositReceived + totalPayments;
  const finalContractValue = parseFloat(projectData?.final_contract_value || projectData?.base_contract_value) || 0;
  const pendingBalance = finalContractValue - totalCollected;

  return (
    <div className="project-details-container">
      {/* Navigation Header with Status Selector and Admin Delete */}
      <div className="details-header-nav">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t('common.backToDashboard')}</span>
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Status Selector (Interactive for Admin, Read-Only for Trabajador) */}
          <div className="status-selector-container">
            <label htmlFor="quick-status-select" className="status-selector-label">
              {t('projectDetails.statusLabel')}
            </label>
            <select
              id="quick-status-select"
              value={currentStatus}
              disabled={!isAdmin || statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`status-dropdown-select ${getProjectStatusBadgeClass(currentStatus)}`}
              style={!isAdmin ? { cursor: 'default', opacity: 0.95 } : {}}
              title={!isAdmin ? t('projectDetails.statusAdminOnlyTitle') : ''}
            >
              <option value="Planeación">{t('projectDetails.statusPlaneacion')}</option>
              <option value="En Ejecución">{t('projectDetails.statusEnEjecucion')}</option>
              <option value="Pausado">{t('projectDetails.statusPausado')}</option>
              <option value="Finalizado">{t('projectDetails.statusFinalizado')}</option>
            </select>
            {statusUpdating && <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{t('common.updating')}</small>}
            {!isAdmin && <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({t('common.readOnly')})</small>}
          </div>

          {/* Admin-Only Delete Project Button */}
          {isAdmin && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="delete-project-btn"
              title="Permanently delete this project"
            >
              <Trash2 size={15} strokeWidth={1.5} />
              <span>{t('projectDetails.deleteProjectBtn')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="project-title-area">
        <h2>{projectData?.project_name}</h2>
        <p>Client: <strong>{projectData?.client_name}</strong></p>
      </div>

      {/* Financial KPI Summary Banner (STRICTLY ADMIN ONLY) */}
      {isAdmin && (
        <div className="financial-banner">
          <h3 className="banner-title">{t('projectDetails.financialSummaryTitle')}</h3>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span>{t('projectDetails.baseContract')}</span>
              <strong>{formatToUSD(projectData?.base_contract_value)}</strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.approvedChanges')}</span>
              <strong>{formatToUSD(projectData?.approved_change_orders)}</strong>
            </div>
            <div className="kpi-card highlight">
              <span>{t('projectDetails.finalContractValue')}</span>
              <strong>{formatToUSD(projectData?.final_contract_value)}</strong>
            </div>
            <div className="kpi-card highlight-gold">
              <span>{t('projectDetails.totalCollected')}</span>
              <strong style={{ color: 'var(--arka-gold)' }}>{formatToUSD(totalCollected)}</strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.pendingBalance')}</span>
              <strong style={{ color: pendingBalance > 0 ? '#D97706' : '#1B7A4A' }}>
                {formatToUSD(pendingBalance)}
              </strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.totalDirectCosts')}</span>
              <strong>{formatToUSD(projectData?.total_direct_costs)}</strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.totalHoursLogged')}</span>
              <strong>{projectData?.total_hours || 0} hrs</strong>
            </div>
            <div className="kpi-card highlight-profit">
              <span>{t('projectDetails.grossProfit')}</span>
              <strong>{formatToUSD(projectData?.gross_profit)}</strong>
            </div>
            <div className="kpi-card highlight-profit">
              <span>{t('projectDetails.grossMargin')}</span>
              <strong>
                {projectData?.gross_margin_percentage
                  ? `${parseFloat(projectData.gross_margin_percentage).toFixed(2)}%`
                  : '0%'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation (Admin only; workers focus on Expenses) */}
      {isAdmin && (
        <div className="tabs-navigation">
          <button 
            className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Receipt size={16} strokeWidth={1.5} />
            <span>{t('projectDetails.tabExpensesHours')}</span>
            <span className="tab-count">{expenses.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'change_orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('change_orders')}
          >
            <FileText size={16} strokeWidth={1.5} />
            <span>{t('projectDetails.tabChangeOrders')}</span>
            <span className="tab-count">{changeOrders.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <Coins size={16} strokeWidth={1.5} />
            <span>{t('projectDetails.tabPayments')}</span>
            <span className="tab-count">{payments.length}</span>
          </button>
        </div>
      )}

      {/* TAB 1: Expenses & Hours (Visible to both Admin and Trabajador) */}
      {(activeTab === 'expenses' || !isAdmin) && (
        <div>
          <div className="section-header-actions">
            <h3>{t('projectDetails.expenseHistoryTitle')}</h3>
            <button 
              className="primary-action-btn"
              onClick={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
            >
              <PlusCircle size={17} strokeWidth={1.5} />
              <span>{t('projectDetails.logExpenseBtn')}</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('expenseForm.categoryLabel')}</th>
                  <th>{t('projectDetails.colSpecifications')}</th>
                  <th className="currency-col">{t('projectDetails.colCostAmount')}</th>
                  <th className="numeric-col">{t('projectDetails.colHours')}</th>
                  <th style={{ textAlign: 'center' }}>{t('projectDetails.colReceipt')}</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="no-data-cell">
                      {t('projectDetails.noExpensesLogged')}
                    </td>
                  </tr>
                ) : (
                  expenses.map((item) => {
                    const isLabor = item.category === 'Mano de Obra';
                    const isMaterial = item.category === 'Materiales' || item.category === 'Otros gastos';
                    const receiptUrls = resolveReceiptUrls(item.receipt_image_url);

                    return (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>
                          <span className={`category-tag ${isLabor ? 'labor' : ''}`}>
                            {item.category}
                          </span>
                        </td>
                        <td>{renderExpenseDetails(item)}</td>

                        {/* Cost Amount (Contextual: strictly '-' for Labor if 0) */}
                        <td className="currency-col" style={{ fontWeight: item.cost_amount > 0 ? 700 : 400 }}>
                          {isLabor 
                            ? (item.cost_amount > 0 ? formatToUSD(item.cost_amount) : '-') 
                            : (item.cost_amount > 0 ? formatToUSD(item.cost_amount) : '-')}
                        </td>

                        {/* Hours (Contextual: strictly '-' for Materiales & Otros gastos) */}
                        <td className="numeric-col" style={{ fontWeight: item.hours_worked > 0 ? 700 : 400 }}>
                          {isMaterial 
                            ? '-' 
                            : (item.hours_worked > 0 ? `${item.hours_worked} hrs` : '-')}
                        </td>
                        
                        {/* Receipt Thumbnail / PDF files */}
                        <td style={{ textAlign: 'center' }}>
                          {receiptUrls.length > 0 ? (
                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                              {receiptUrls.map((url, idx) => {
                                const isPdf = isPdfUrl(url);
                                if (isPdf) {
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Open PDF Document"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        color: '#B91C1C',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                                        e.currentTarget.style.borderColor = '#F87171';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = '#FEF2F2';
                                        e.currentTarget.style.borderColor = '#FECACA';
                                      }}
                                    >
                                      <FileText size={14} strokeWidth={2} />
                                      <span>PDF</span>
                                    </a>
                                  );
                                }

                                return (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`Receipt ${idx + 1}`}
                                    onClick={() => setSelectedReceiptImage(url)}
                                    title="Click to view full receipt in-app"
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      border: '1px solid #cbd5e1',
                                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                      cursor: 'pointer',
                                      transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                                      display: 'inline-block'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.12)';
                                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.18)';
                                      e.currentTarget.style.borderColor = 'var(--arka-gold)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>

                        {/* Actions (Admin Only: Edit & Delete) */}
                        {isAdmin && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <button
                                className="table-action-edit-btn"
                                title={t('common.edit')}
                                onClick={() => {
                                  setEditingExpense(item);
                                  setIsExpenseModalOpen(true);
                                }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <Pencil size={13} strokeWidth={1.5} />
                                <span>{t('common.edit')}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteExpense(item)}
                                disabled={actionLoadingId === item.id}
                                title={t('common.delete')}
                                className="delete-expense-btn"
                              >
                                {actionLoadingId === item.id ? '...' : <Trash2 size={14} strokeWidth={1.5} />}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Change Orders (Extras) (Strictly Admin Only) */}
      {isAdmin && activeTab === 'change_orders' && (
        <div>
          <div className="info-callout">
            <Info size={18} strokeWidth={1.5} />
            <div>
              <strong>{t('projectDetails.financialImpactNote')}</strong>
            </div>
          </div>

          <div className="section-header-actions">
            <h3>{t('projectDetails.changeOrdersTitle')}</h3>
            <button 
              className="primary-action-btn"
              onClick={() => {
                setEditingChangeOrder(null);
                setIsChangeOrderModalOpen(true);
              }}
            >
              <PlusCircle size={17} strokeWidth={1.5} />
              <span>{t('projectDetails.newChangeOrderBtn')}</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('projectDetails.colDescription')}</th>
                  <th className="currency-col">{t('projectDetails.colExtraCharge')}</th>
                  <th>{t('common.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      {t('projectDetails.noChangeOrdersLogged')}
                    </td>
                  </tr>
                ) : (
                  changeOrders.map((co) => {
                    const isApproved = (co.status || '').toLowerCase() === 'aprobado' || (co.status || '').toLowerCase() === 'approved';

                    return (
                      <tr key={co.id}>
                        <td><strong>{co.description}</strong></td>
                        <td className="currency-col" style={{ fontWeight: 700 }}>
                          {formatToUSD(co.extra_charge_to_client)}
                        </td>
                        <td>
                          <span className={`status-pill ${getStatusClass(co.status)}`}>
                            {co.status || 'Borrador'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              className="table-action-edit-btn"
                              title={t('common.edit')}
                              onClick={() => {
                                setEditingChangeOrder(co);
                                setIsChangeOrderModalOpen(true);
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <Pencil size={13} strokeWidth={1.5} />
                              <span>{t('common.edit')}</span>
                            </button>

                            {!isApproved && (
                              <button
                                className="approve-btn"
                                disabled={actionLoadingId === co.id}
                                onClick={() => handleApproveChangeOrder(co.id, co.description, co.extra_charge_to_client)}
                              >
                                {actionLoadingId === co.id ? (
                                  t('projectDetails.approving')
                                ) : (
                                  <>
                                    <Check size={14} strokeWidth={1.5} />
                                    <span>{t('projectDetails.approveBtn')}</span>
                                  </>
                                )}
                              </button>
                            )}
                            {isApproved && (
                              <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={14} strokeWidth={1.5} />
                                <span>{t('projectDetails.activeStatus')}</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Client Payments (Abonos) (Strictly Admin Only) */}
      {isAdmin && activeTab === 'payments' && (
        <div>
          <div className="section-header-actions">
            <div>
              <h3>{t('projectDetails.paymentsTitle')}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--arka-text-secondary)' }}>
                {t('projectDetails.paymentsSubtitle')}
              </p>
            </div>
            <button 
              className="primary-action-btn"
              onClick={() => {
                setEditingPayment(null);
                setIsPaymentModalOpen(true);
              }}
            >
              <PlusCircle size={17} strokeWidth={1.5} />
              <span>{t('projectDetails.logPaymentBtn')}</span>
            </button>
          </div>

          {/* Quick Payments Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
            padding: '16px',
            background: 'var(--arka-bg)',
            border: '1px solid var(--arka-border)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--arka-text-secondary)', fontWeight: 600 }}>
                {t('projectDetails.initialDeposit')}
              </span>
              <strong style={{ display: 'block', fontSize: '18px', color: 'var(--arka-navy)', marginTop: '2px', fontFamily: 'var(--font-display)' }}>
                {formatToUSD(depositReceived)}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--arka-text-secondary)', fontWeight: 600 }}>
                {t('projectDetails.totalPayments')}
              </span>
              <strong style={{ display: 'block', fontSize: '18px', color: 'var(--arka-navy)', marginTop: '2px', fontFamily: 'var(--font-display)' }}>
                {formatToUSD(totalPayments)}
              </strong>
            </div>
            <div style={{ borderLeft: '2px solid var(--arka-gold)', paddingLeft: '12px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--arka-gold)', fontWeight: 600 }}>
                {t('projectDetails.totalCollected')}
              </span>
              <strong style={{ display: 'block', fontSize: '20px', color: 'var(--arka-gold)', marginTop: '2px', fontFamily: 'var(--font-display)' }}>
                {formatToUSD(totalCollected)}
              </strong>
            </div>
            <div style={{ borderLeft: '2px solid var(--arka-border)', paddingLeft: '12px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--arka-text-secondary)', fontWeight: 600 }}>
                {t('projectDetails.pendingBalance')}
              </span>
              <strong style={{ 
                display: 'block', 
                fontSize: '20px', 
                color: pendingBalance > 0 ? '#D97706' : '#1B7A4A', 
                marginTop: '2px', 
                fontFamily: 'var(--font-display)' 
              }}>
                {formatToUSD(pendingBalance)}
              </strong>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('projectDetails.colPaymentDate')}</th>
                  <th>{t('projectDetails.colPaymentDescription')}</th>
                  <th className="currency-col">{t('projectDetails.colPaymentAmount')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      {t('projectDetails.noPaymentsLogged')}
                    </td>
                  </tr>
                ) : (
                  payments.map((pay) => (
                    <tr key={pay.id}>
                      <td><strong>{pay.payment_date}</strong></td>
                      <td>{pay.description || <span style={{ color: '#9ca3af' }}>-</span>}</td>
                      <td className="currency-col" style={{ fontWeight: 700, color: '#1B7A4A' }}>
                        {formatToUSD(pay.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            className="table-action-edit-btn"
                            title={t('common.edit')}
                            onClick={() => {
                              setEditingPayment(pay);
                              setIsPaymentModalOpen(true);
                            }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Pencil size={13} strokeWidth={1.5} />
                            <span>{t('common.edit')}</span>
                          </button>

                          <button
                            onClick={() => handleDeletePayment(pay)}
                            disabled={actionLoadingId === pay.id}
                            title={t('common.delete')}
                            className="delete-expense-btn"
                          >
                            {actionLoadingId === pay.id ? '...' : <Trash2 size={14} strokeWidth={1.5} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals (Creation & Edit) */}
      {isExpenseModalOpen && (
        <NewExpenseForm
          projectId={projectId}
          expenseToEdit={editingExpense}
          onSuccess={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
            fetchAllData();
          }}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}

      {isChangeOrderModalOpen && (
        <NewChangeOrderModal
          projectId={projectId}
          changeOrderToEdit={editingChangeOrder}
          onClose={() => {
            setIsChangeOrderModalOpen(false);
            setEditingChangeOrder(null);
          }}
          onCreated={() => {
            setIsChangeOrderModalOpen(false);
            setEditingChangeOrder(null);
            fetchAllData();
          }}
        />
      )}

      {isPaymentModalOpen && (
        <NewPaymentModal
          projectId={projectId}
          projectName={projectData?.project_name || ''}
          paymentToEdit={editingPayment}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setEditingPayment(null);
          }}
          onSaved={() => {
            setIsPaymentModalOpen(false);
            setEditingPayment(null);
            fetchAllData();
          }}
        />
      )}

      {/* Delete Project Confirmation Modal (Admin Only) */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}>
          <div 
            className="modal-content"
            style={{ maxWidth: '440px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: '#ef4444', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <AlertTriangle size={40} strokeWidth={1.25} />
            </div>
            <h3 style={{ margin: '0 0 0.75rem 0', color: '#991b1b', fontSize: '1.25rem' }}>
              {t('projectDetails.deleteConfirmTitle')}
            </h3>
            <p style={{ margin: '0 0 1.75rem 0', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {t('projectDetails.deleteConfirmMsg')}
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 0 }}>
              <button
                type="button"
                className="cancel-btn"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                {t('projectDetails.deleteCancelBtn')}
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                disabled={isDeleting}
                onClick={handleDeleteProject}
              >
                <Trash2 size={15} strokeWidth={1.5} />
                <span>{isDeleting ? t('common.deleting') : t('projectDetails.deleteProceedBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Lightbox Popup Modal for Receipts */}
      {selectedReceiptImage && (
        <div 
          className="modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
          onClick={() => setSelectedReceiptImage(null)}
        >
          {/* Close Button in Top-Right Corner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReceiptImage(null);
            }}
            style={{
              position: 'fixed',
              top: '1.5rem',
              right: '1.75rem',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              fontSize: '1.75rem',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              zIndex: 10000
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Close Receipt (Esc)"
          >
            <X size={22} strokeWidth={1.5} />
          </button>

          {/* Centered High-Res Image Container */}
          <div 
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'default'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedReceiptImage}
              alt="Receipt Full View"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
