import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import NewExpenseForm from './NewExpenseForm.jsx';
import NewChangeOrderModal from './NewChangeOrderModal.jsx';
import './ProjectDetails.css';

export default function ProjectDetails({ projectId, onBack }) {
  const [projectData, setProjectData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'change_orders'
  const [loading, setLoading] = useState(true);
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

      // 3. Fetch change orders for this project
      const { data: coData, error: coError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('id', { ascending: false });

      if (coError) throw coError;
      setChangeOrders(coData || []);

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
  }, [projectId]);

  const handleApproveChangeOrder = async (changeOrderId) => {
    try {
      setActionLoadingId(changeOrderId);
      const { error: updateError } = await supabase
        .from('change_orders')
        .update({ status: 'Aprobado' })
        .eq('id', changeOrderId);

      if (updateError) throw updateError;

      await fetchAllData();
    } catch (err) {
      console.error('Error approving change order:', err);
      alert('Failed to approve change order: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoadingId(null);
    }
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
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error && !projectData) {
    return (
      <div className="project-details-container">
        <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="project-details-container">
      {/* Navigation Header */}
      <div className="details-header-nav">
        <button className="back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <span className="status-badge">{projectData?.status || 'Planning'}</span>
      </div>

      <div className="project-title-area">
        <h2>{projectData?.project_name}</h2>
        <p>Client: <strong>{projectData?.client_name}</strong></p>
      </div>

      {/* Financial KPI Summary Banner */}
      <div className="financial-banner">
        <h3 className="banner-title">Financial Summary & Job Costing</h3>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span>Base Contract</span>
            <strong>{formatCurrency(projectData?.base_contract_value)}</strong>
          </div>
          <div className="kpi-card">
            <span>Approved Changes</span>
            <strong>{formatCurrency(projectData?.approved_change_orders)}</strong>
          </div>
          <div className="kpi-card highlight">
            <span>Final Contract Value</span>
            <strong>{formatCurrency(projectData?.final_contract_value)}</strong>
          </div>
          <div className="kpi-card">
            <span>Total Direct Costs</span>
            <strong>{formatCurrency(projectData?.total_direct_costs)}</strong>
          </div>
          <div className="kpi-card">
            <span>Total Hours Logged</span>
            <strong>{projectData?.total_hours || 0} hrs</strong>
          </div>
          <div className="kpi-card highlight-profit">
            <span>Gross Profit</span>
            <strong>{formatCurrency(projectData?.gross_profit)}</strong>
          </div>
          <div className="kpi-card highlight-profit">
            <span>Gross Margin</span>
            <strong>
              {projectData?.gross_margin_percentage
                ? `${parseFloat(projectData.gross_margin_percentage).toFixed(2)}%`
                : '0%'}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses & Hours <span className="tab-count">{expenses.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'change_orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('change_orders')}
        >
          Change Orders (Extras) <span className="tab-count">{changeOrders.length}</span>
        </button>
      </div>

      {/* TAB 1: Expenses & Hours */}
      {activeTab === 'expenses' && (
        <div>
          <div className="section-header-actions">
            <h3>Expense & Hours History</h3>
            <button 
              className="primary-action-btn"
              onClick={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
            >
              + Log Expense / Hours
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Specifications / Details</th>
                  <th>Cost Amount</th>
                  <th>Hours</th>
                  <th>Receipt</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data-cell">
                      No expenses or hours logged yet for this project.
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
                              📎 View Receipt ↗
                            </a>
                          ) : (
                            <span style={{ color: '#2563eb', fontSize: '0.85rem' }}>
                              📎 {item.receipt_image_url}
                            </span>
                          )
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="table-action-edit-btn"
                          title="Edit this expense"
                          onClick={() => {
                            setEditingExpense(item);
                            setIsExpenseModalOpen(true);
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Change Orders (Extras) */}
      {activeTab === 'change_orders' && (
        <div>
          <div className="info-callout">
            <span>ℹ️</span>
            <div>
              <strong>Financial Impact:</strong> Only <strong>Aprobado</strong> change orders are added to the Final Contract Value and Gross Profit above.
            </div>
          </div>

          <div className="section-header-actions">
            <h3>Change Orders (Extras)</h3>
            <button 
              className="primary-action-btn"
              onClick={() => {
                setEditingChangeOrder(null);
                setIsChangeOrderModalOpen(true);
              }}
            >
              + New Change Order
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Extra Charge to Client</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      No change orders created yet for this project.
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
                              title="Edit this change order"
                              onClick={() => {
                                setEditingChangeOrder(co);
                                setIsChangeOrderModalOpen(true);
                              }}
                            >
                              ✏️ Edit
                            </button>

                            {!isApproved && (
                              <button
                                className="approve-btn"
                                disabled={actionLoadingId === co.id}
                                onClick={() => handleApproveChangeOrder(co.id)}
                              >
                                {actionLoadingId === co.id ? 'Approving...' : '✓ Approve'}
                              </button>
                            )}
                            {isApproved && (
                              <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                                ✓ Active
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

      {/* Modals */}
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
