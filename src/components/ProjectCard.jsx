import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import './Dashboard.css';

export default function ProjectCard({ project, onSelectProject, onEditProject, userRole = 'trabajador' }) {
  const { t } = useLanguage();
  const isAdmin = userRole === 'admin';

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('ejecución') || s.includes('ejecucion') || s.includes('progress')) return 'en-ejecucion';
    if (s.includes('pausado') || s.includes('paused')) return 'pausado';
    if (s.includes('finalizado') || s.includes('completed') || s.includes('terminado')) return 'finalizado';
    return 'planeacion';
  };

  const statusText = project.status || 'Planeación';

  return (
    <div className="project-card">
      <div className="project-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className={`status-badge ${getStatusBadgeClass(statusText)}`} style={{ margin: 0 }}>
            {statusText}
          </div>
          {isAdmin && onEditProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditProject(project);
              }}
              className="card-edit-btn"
              title={t('common.edit')}
            >
              ✏️ {t('common.edit')}
            </button>
          )}
        </div>
        <h3 className="project-name">{project.project_name}</h3>
        <p className="client-name">{project.client_name}</p>
      </div>
      
      {/* Financial Metrics (Strictly Admin Only) */}
      {isAdmin && (
        <div className="project-metrics">
          <div className="metric">
            <span>{t('dashboard.grossProfit')}</span>
            <strong>{formatToUSD(project.gross_profit)}</strong>
          </div>
          <div className="metric">
            <span>{t('dashboard.grossMargin')}</span>
            <strong>{project.gross_margin_percentage ? `${parseFloat(project.gross_margin_percentage).toFixed(2)}%` : '0%'}</strong>
          </div>
        </div>
      )}

      <button 
        className="enter-btn"
        style={!isAdmin ? { marginTop: '1.25rem' } : {}}
        onClick={() => onSelectProject(project.project_id || project.id)}
      >
        {t('dashboard.enterProjectBtn')}
      </button>
    </div>
  );
}
