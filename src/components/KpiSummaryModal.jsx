import './Dashboard.css';

export default function KpiSummaryModal({ kpiType, projects, onClose, onSelectProject }) {
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('ejecución') || s.includes('ejecucion') || s.includes('progress')) return 'en-ejecucion';
    if (s.includes('pausado') || s.includes('paused')) return 'pausado';
    if (s.includes('finalizado') || s.includes('completed') || s.includes('terminado')) return 'finalizado';
    return 'planeacion';
  };

  // Configure modal content according to selected KPI
  let modalTitle = '';
  let modalIcon = '';
  let modalSubtitle = '';
  let displayProjects = [...projects];
  let totalSummaryBadge = '';

  if (kpiType === 'profit') {
    modalTitle = 'Total Company Profit Breakdown';
    modalIcon = '💰';
    modalSubtitle = 'All projects sorted by gross profit generated';
    displayProjects.sort((a, b) => (parseFloat(b.gross_profit) || 0) - (parseFloat(a.gross_profit) || 0));
    const total = displayProjects.reduce((sum, p) => sum + (parseFloat(p.gross_profit) || 0), 0);
    totalSummaryBadge = `Grand Total: ${formatCurrency(total)}`;
  } else if (kpiType === 'hours') {
    modalTitle = 'Total Hours Worked Breakdown';
    modalIcon = '⏱️';
    modalSubtitle = 'All projects sorted by total labor hours logged';
    displayProjects.sort((a, b) => (parseFloat(b.total_hours) || 0) - (parseFloat(a.total_hours) || 0));
    const total = displayProjects.reduce((sum, p) => sum + (parseFloat(p.total_hours) || 0), 0);
    totalSummaryBadge = `Grand Total: ${total} hrs`;
  } else if (kpiType === 'active') {
    modalTitle = 'Active Projects Overview';
    modalIcon = '🏗️';
    modalSubtitle = 'Currently active jobs in planning, progress, or paused';
    displayProjects = displayProjects.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s !== 'finalizado' && s !== 'completed' && s !== 'terminado';
    });
    totalSummaryBadge = `Active Count: ${displayProjects.length} projects`;
  } else if (kpiType === 'volume') {
    modalTitle = 'Total Contract Volume Breakdown';
    modalIcon = '📈';
    modalSubtitle = 'All projects sorted by final contract value';
    displayProjects.sort((a, b) => (parseFloat(b.final_contract_value) || 0) - (parseFloat(a.final_contract_value) || 0));
    const total = displayProjects.reduce((sum, p) => sum + (parseFloat(p.final_contract_value) || 0), 0);
    totalSummaryBadge = `Grand Total: ${formatCurrency(total)}`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content kpi-drilldown-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="kpi-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>{modalIcon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 700 }}>
                {modalTitle}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                {modalSubtitle}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="kpi-modal-close-btn"
          >
            &times;
          </button>
        </div>

        {/* Metric Summary Pill */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="kpi-modal-badge">{totalSummaryBadge}</span>
        </div>

        {/* Table Content */}
        <div className="table-responsive" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Project / Client</th>
                {kpiType === 'profit' && (
                  <>
                    <th style={{ textAlign: 'right' }}>Gross Profit</th>
                    <th style={{ textAlign: 'right' }}>Margin %</th>
                  </>
                )}
                {kpiType === 'hours' && (
                  <>
                    <th style={{ textAlign: 'right' }}>Total Hours</th>
                    <th style={{ textAlign: 'right' }}>Direct Costs</th>
                  </>
                )}
                {kpiType === 'active' && (
                  <>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Contract Value</th>
                  </>
                )}
                {kpiType === 'volume' && (
                  <>
                    <th style={{ textAlign: 'right' }}>Base Contract</th>
                    <th style={{ textAlign: 'right' }}>Approved Extras</th>
                    <th style={{ textAlign: 'right' }}>Final Contract</th>
                  </>
                )}
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayProjects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data-cell">
                    No matching projects found for this metric.
                  </td>
                </tr>
              ) : (
                displayProjects.map((p) => {
                  const targetId = p.project_id || p.id;
                  const statusText = p.status || 'Planeación';

                  return (
                    <tr key={targetId} className="kpi-drilldown-row">
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block' }}>{p.project_name}</strong>
                        <small style={{ color: '#64748b', textTransform: 'uppercase' }}>{p.client_name}</small>
                      </td>

                      {/* Profit columns */}
                      {kpiType === 'profit' && (
                        <>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: (parseFloat(p.gross_profit) || 0) >= 0 ? '#047857' : '#b91c1c' }}>
                            {formatCurrency(p.gross_profit)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {p.gross_margin_percentage ? `${parseFloat(p.gross_margin_percentage).toFixed(2)}%` : '0%'}
                          </td>
                        </>
                      )}

                      {/* Hours columns */}
                      {kpiType === 'hours' && (
                        <>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {p.total_hours || 0} hrs
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>
                            {formatCurrency(p.total_direct_costs)}
                          </td>
                        </>
                      )}

                      {/* Active columns */}
                      {kpiType === 'active' && (
                        <>
                          <td>
                            <span className={`status-badge ${getStatusBadgeClass(statusText)}`}>
                              {statusText}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(p.final_contract_value)}
                          </td>
                        </>
                      )}

                      {/* Volume columns */}
                      {kpiType === 'volume' && (
                        <>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>
                            {formatCurrency(p.base_contract_value)}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>
                            {formatCurrency(p.approved_change_orders)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {formatCurrency(p.final_contract_value)}
                          </td>
                        </>
                      )}

                      {/* Quick jump to project */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProject(targetId);
                          }}
                          className="drilldown-enter-btn"
                          title="Open Project Details"
                        >
                          View ↗
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
