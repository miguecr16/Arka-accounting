import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import NewExpenseForm from './NewExpenseForm.jsx';
import NewChangeOrderModal from './NewChangeOrderModal.jsx';
import './ProjectDetails.css';

export default function ProjectDetails({ projectId, onBack, userRole = 'trabajador' }) {
  const { t } = useLanguage();
  const isAdmin = userRole === 'admin';

  const [projectData, setProjectData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'change_orders'
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');
  
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [isChangeOrderModalOpen, setIsChangeOrderModalOpen] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState(null);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

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

      // 3. Fetch change orders for this project (if admin)
      if (isAdmin) {
        const { data: coData, error: coError } = await supabase
          .from('change_orders')
          .select('*')
          .eq('project_id', projectId)
          .order('id', { ascending: false });

        if (coError) throw coError;
        setChangeOrders(coData || []);
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

  const handleApproveChangeOrder = async (changeOrderId, description, charge) => {
    if (!isAdmin) return;

    try {
      setActionLoadingId(changeOrderId);
      const { error: updateError } = await supabase
        .from('change_orders')
        .update({ status: 'Aprobado' })
        .eq('id', changeOrderId);

      if (updateError) throw updateError;

      // Log audit event for Change Order approval
      await logAuditEvent({
        action: 'Aprobó',
        entity: 'Change Order',
        details: `Aprobó Change Order "${description || '#' + changeOrderId}" ($${charge || 0}) en proyecto "${projectData?.project_name}"`
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
    if (!d || typeof d !== 'object' || Object.keys(d).length === 0) {
      return <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>-</span>;
    }

    if (item.category === 'Cabinets') {
      return (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {d.provider && <strong>{d.provider} </strong>}
          {d.model && <span>• {d.model} </span>}
          {d.color && <span style={{ color: '#4b5563' }}>({d.color}) </span>}
          {d.quantity && <span className="detail-pill">{d.quantity} units</span>}
        </div>
      );
    }

    if (item.category === 'Countertops') {
      return (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          {d.material && <strong>{d.material} </strong>}
          {d.provider && <span style={{ color: '#4b5563' }}>({d.provider}) </span>}
          {(d.slabs || d.sqft) && (
            <span className="detail-pill">
              {d.slabs ? `${d.slabs} slabs` : ''}
              {d.slabs && d.sqft ? ' • ' : ''}
              {d.sqft ? `${d.sqft} sqft` : ''}
            </span>
          )}
        </div>
      );
    }

    return (
      <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
        {Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' • ')}
      </div>
    );
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
        <button className="back-btn" onClick={onBack}>{t('common.backToDashboard')}</button>
        <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>
      </div>
    );
  }

  const currentStatus = projectData?.status || 'Planeación';

  return (
    <div className="project-details-container">
      {/* Navigation Header with Status Selector */}
      <div className="details-header-nav">
        <button className="back-btn" onClick={onBack}>
          {t('common.backToDashboard')}
        </button>
        
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
              <strong>{formatCurrency(projectData?.base_contract_value)}</strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.approvedChanges')}</span>
              <strong>{formatCurrency(projectData?.approved_change_orders)}</strong>
            </div>
            <div className="kpi-card highlight">
              <span>{t('projectDetails.finalContractValue')}</span>
              <strong>{formatCurrency(projectData?.final_contract_value)}</strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.totalDirectCosts')}</span>
              <strong>{formatCurrency(projectData?.total_direct_costs)}</strong>
            </div>
            <div className="kpi-card">
              <span>{t('projectDetails.totalHoursLogged')}</span>
              <strong>{projectData?.total_hours || 0} hrs</strong>
            </div>
            <div className="kpi-card highlight-profit">
              <span>{t('projectDetails.grossProfit')}</span>
              <strong>{formatCurrency(projectData?.gross_profit)}</strong>
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
            {t('projectDetails.tabExpensesHours')} <span className="tab-count">{expenses.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'change_orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('change_orders')}
          >
            {t('projectDetails.tabChangeOrders')} <span className="tab-count">{changeOrders.length}</span>
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
              {t('projectDetails.logExpenseBtn')}
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.date')}</th>
                  <th>{t('expenseForm.categoryLabel')}</th>
                  <th>{t('projectDetails.colSpecifications')}</th>
                  <th>{t('projectDetails.colCostAmount')}</th>
                  <th>{t('projectDetails.colHours')}</th>
                  <th>{t('projectDetails.colReceipt')}</th>
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
                  expenses.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>
                        <span className={`category-tag ${item.category === 'Mano de Obra' ? 'labor' : ''}`}>
                          {item.category}
                        </span>
                      </td>
                      <td>{renderExpenseDetails(item)}</td>
                      <td>{item.cost_amount > 0 ? formatCurrency(item.cost_amount) : '-'}</td>
                      <td>{item.hours_worked > 0 ? `${item.hours_worked} hrs` : '-'}</td>
                      <td>
                        {item.receipt_image_url ? (
                          item.receipt_image_url.startsWith('http') ? (
                            <a 
                              href={item.receipt_image_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#2563eb', 
                                textDecoration: 'none',
                                fontWeight: 500,
                                fontSize: '0.85rem'
                              }}
                            >
                              📎 {t('common.viewReceipt')}
                            </a>
                          ) : (
                            <span style={{ color: '#2563eb', fontSize: '0.85rem' }}>
                              📎 {item.receipt_image_url}
                            </span>
                          )
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('common.none')}</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="table-action-edit-btn"
                            title={t('common.edit')}
                            onClick={() => {
                              setEditingExpense(item);
                              setIsExpenseModalOpen(true);
                            }}
                          >
                            ✏️ {t('common.edit')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
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
            <span>ℹ️</span>
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
              {t('projectDetails.newChangeOrderBtn')}
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('projectDetails.colDescription')}</th>
                  <th>{t('projectDetails.colExtraCharge')}</th>
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
                        <td>{formatCurrency(co.extra_charge_to_client)}</td>
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
                            >
                              ✏️ {t('common.edit')}
                            </button>

                            {!isApproved && (
                              <button
                                className="approve-btn"
                                disabled={actionLoadingId === co.id}
                                onClick={() => handleApproveChangeOrder(co.id, co.description, co.extra_charge_to_client)}
                              >
                                {actionLoadingId === co.id ? t('projectDetails.approving') : t('projectDetails.approveBtn')}
                              </button>
                            )}
                            {isApproved && (
                              <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                                {t('projectDetails.activeStatus')}
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
    </div>
  );
}
