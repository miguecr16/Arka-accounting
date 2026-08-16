import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import NewExpenseForm from './NewExpenseForm.jsx';
import './ProjectDetails.css';

export default function ProjectDetails({ projectId, onBack }) {
  const [projectData, setProjectData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const fetchProjectDetails = async () => {
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
    } catch (err) {
      console.error('Error fetching project details:', err);
      setError('Could not load project details. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  const handleExpenseSaved = () => {
    setIsExpenseModalOpen(false);
    fetchProjectDetails();
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

      {/* Expense History Section */}
      <div className="history-section-header">
        <h3>Expense & Hours History</h3>
        <button 
          className="log-expense-btn"
          onClick={() => setIsExpenseModalOpen(true)}
        >
          + Log Expense / Hours
        </button>
      </div>

      <div className="table-responsive">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Cost Amount</th>
              <th>Hours</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data-cell">
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
                  <td>{item.cost_amount > 0 ? formatCurrency(item.cost_amount) : '-'}</td>
                  <td>{item.hours_worked > 0 ? `${item.hours_worked} hrs` : '-'}</td>
                  <td>
                    {item.receipt_image_url ? (
                      <span title={item.receipt_image_url} style={{ color: '#2563eb', fontSize: '0.85rem' }}>
                        📎 Attached
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>None</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Log Expense Modal */}
      {isExpenseModalOpen && (
        <NewExpenseForm
          projectId={projectId}
          onSuccess={handleExpenseSaved}
          onClose={() => setIsExpenseModalOpen(false)}
        />
      )}
    </div>
  );
}
