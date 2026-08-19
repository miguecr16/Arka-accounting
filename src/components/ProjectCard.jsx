import './Dashboard.css';

export default function ProjectCard({ project, onSelectProject, onEditProject }) {
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="project-card">
      <div className="project-card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="status-badge" style={{ margin: 0 }}>{project.status || 'Planning'}</div>
          {onEditProject && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditProject(project);
              }}
              className="card-edit-btn"
              title="Edit Project Details"
            >
              ✏️ Edit
            </button>
          )}
        </div>
        <h3 className="project-name">{project.project_name}</h3>
        <p className="client-name">{project.client_name}</p>
      </div>
      
      <div className="project-metrics">
        <div className="metric">
          <span>Gross Profit</span>
          <strong>{formatCurrency(project.gross_profit)}</strong>
        </div>
        <div className="metric">
          <span>Margin</span>
          <strong>{project.gross_margin_percentage ? `${parseFloat(project.gross_margin_percentage).toFixed(2)}%` : '0%'}</strong>
        </div>
      </div>

      <button 
        className="enter-btn"
        onClick={() => onSelectProject(project.project_id || project.id)}
      >
        Enter Project / Log Data
      </button>
    </div>
  );
}
