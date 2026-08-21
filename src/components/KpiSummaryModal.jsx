import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import './Dashboard.css';

export default function KpiSummaryModal({ kpiType, projects, onClose, onSelectProject }) {
  const { t } = useLanguage();

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
    modalTitle = t('kpiModal.profitTitle');
    modalIcon = '💰';
    modalSubtitle = t('kpiModal.profitSub');
    displayProjects.sort((a, b) => (parseFloat(b.gross_profit) || 0) - (parseFloat(a.gross_profit) || 0));
    const total = displayProjects.reduce((sum, p) => sum + (parseFloat(p.gross_profit) || 0), 0);
    totalSummaryBadge = `${t('common.grandTotal')}: ${formatToUSD(total)}`;
  } else if (kpiType === 'hours') {
    modalTitle = t('kpiModal.hoursTitle');
    modalIcon = '⏱️';
    modalSubtitle = t('kpiModal.hoursSub');
    displayProjects.sort((a, b) => (parseFloat(b.total_hours) || 0) - (parseFloat(a.total_hours) || 0));
    const total = displayProjects.reduce((sum, p) => sum + (parseFloat(p.total_hours) || 0), 0);
    totalSummaryBadge = `${t('common.grandTotal')}: ${total} hrs`;
  } else if (kpiType === 'active') {
    modalTitle = t('kpiModal.activeTitle');
    modalIcon = '🏗️';
    modalSubtitle = t('kpiModal.activeSub');
    displayProjects = displayProjects.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s !== 'finalizado' && s !== 'completed' && s !== 'terminado';
    });
    totalSummaryBadge = `${t('dashboard.activeProjects')}: ${displayProjects.length}`;
  } else if (kpiType === 'volume') {
    modalTitle = t('kpiModal.volumeTitle');
    modalIcon = '📈';
    modalSubtitle = t('kpiModal.volumeSub');
    displayProjects.sort((a, b) => (parseFloat(b.final_contract_value) || 0) - (parseFloat(a.final_contract_value) || 0));
    const total = displayProjects.reduce((sum, p) => sum + (parseFloat(p.final_contract_value) || 0), 0);
    totalSummaryBadge = `${t('common.grandTotal')}: ${formatToUSD(total)}`;
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
                <th>{t('kpiModal.projectClient')}</th>
                {kpiType === 'profit' && (
                  <>
                    <th className="currency-col">{t('kpiModal.grossProfitCol')}</th>
                    <th className="numeric-col">{t('kpiModal.marginCol')}</th>
                  </>
                )}
                {kpiType === 'hours' && (
                  <>
                    <th className="numeric-col">{t('kpiModal.totalHoursCol')}</th>
                    <th className="currency-col">{t('kpiModal.directCostsCol')}</th>
                  </>
                )}
                {kpiType === 'active' && (
                  <>
                    <th>{t('kpiModal.statusCol')}</th>
                    <th className="currency-col">{t('kpiModal.contractValueCol')}</th>
                  </>
                )}
                {kpiType === 'volume' && (
                  <>
                    <th className="currency-col">{t('kpiModal.baseContractCol')}</th>
                    <th className="currency-col">{t('kpiModal.approvedExtrasCol')}</th>
                    <th className="currency-col">{t('kpiModal.finalContractCol')}</th>
                  </>
                )}
                <th style={{ textAlign: 'center' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {displayProjects.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data-cell">
                    {t('kpiModal.noProjectsFound')}
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
                          <td className="currency-col" style={{ fontWeight: 700, color: (parseFloat(p.gross_profit) || 0) >= 0 ? '#047857' : '#b91c1c' }}>
                            {formatToUSD(p.gross_profit)}
                          </td>
                          <td className="numeric-col" style={{ fontWeight: 600, color: '#334155' }}>
                            {p.gross_margin_percentage ? `${parseFloat(p.gross_margin_percentage).toFixed(2)}%` : '0%'}
                          </td>
                        </>
                      )}

                      {/* Hours columns */}
                      {kpiType === 'hours' && (
                        <>
                          <td className="numeric-col" style={{ fontWeight: 700, color: '#0f172a' }}>
                            {p.total_hours || 0} hrs
                          </td>
                          <td className="currency-col" style={{ color: '#64748b' }}>
                            {formatToUSD(p.total_direct_costs)}
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
                          <td className="currency-col" style={{ fontWeight: 600 }}>
                            {formatToUSD(p.final_contract_value)}
                          </td>
                        </>
                      )}

                      {/* Volume columns */}
                      {kpiType === 'volume' && (
                        <>
                          <td className="currency-col" style={{ color: '#64748b' }}>
                            {formatToUSD(p.base_contract_value)}
                          </td>
                          <td className="currency-col" style={{ color: '#64748b' }}>
                            {formatToUSD(p.approved_change_orders)}
                          </td>
                          <td className="currency-col" style={{ fontWeight: 700, color: '#0f172a' }}>
                            {formatToUSD(p.final_contract_value)}
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
                          title={t('common.viewProject')}
                        >
                          {t('common.viewProject')}
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
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
