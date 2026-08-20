import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../context/LanguageContext.jsx';
import ProjectCard from './ProjectCard.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import KpiSummaryModal from './KpiSummaryModal.jsx';
import './Dashboard.css';

export default function Dashboard({ onSelectProject, userRole = 'trabajador' }) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeKpiModal, setActiveKpiModal] = useState(null); // 'profit' | 'hours' | 'active' | 'volume' | null
  const [error, setError] = useState('');

  const isAdmin = userRole === 'admin';

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const fetchProjects = async () => {
    try {
      // Fetch strictly from the view
      const { data, error: dbError } = await supabase
        .from('projects_dashboard_view')
        .select('*');

      if (dbError) throw dbError;
      
      const sortedData = (data || []).sort((a, b) => a.project_name.localeCompare(b.project_name));
      setProjects(sortedData);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Could not load projects. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Global Company Overview calculations (Admin only)
  const totalCompanyProfit = projects.reduce(
    (acc, p) => acc + (parseFloat(p.gross_profit) || 0),
    0
  );

  const totalCompanyHours = projects.reduce(
    (acc, p) => acc + (parseFloat(p.total_hours) || 0),
    0
  );

  const activeProjectsCount = projects.filter((p) => {
    const s = (p.status || '').toLowerCase();
    return s !== 'finalizado' && s !== 'completed' && s !== 'terminado';
  }).length;

  const totalContractVolume = projects.reduce(
    (acc, p) => acc + (parseFloat(p.final_contract_value) || 0),
    0
  );

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (projectSummary) => {
    try {
      const targetId = projectSummary.project_id || projectSummary.id;
      const { data: fullProject, error: fetchErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', targetId)
        .single();

      if (fetchErr) throw fetchErr;
      setEditingProject(fullProject);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching project for edit:', err);
      setEditingProject(projectSummary);
      setIsModalOpen(true);
    }
  };

  const handleProjectSaved = () => {
    fetchProjects();
    setIsModalOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="dashboard-container">
      {/* 1. GLOBAL COMPANY OVERVIEW (STRICTLY ADMIN ONLY) */}
      {isAdmin && (
        <section className="global-overview-section">
          <div className="global-overview-header">
            <div>
              <h2 className="overview-title">{t('dashboard.globalOverviewTitle')}</h2>
              <p className="overview-subtitle">{t('dashboard.globalOverviewSubtitle')}</p>
            </div>
            <div className="studio-pill">{t('dashboard.studioPill')}</div>
          </div>

          <div className="global-kpi-grid">
            {/* KPI 1: Profit */}
            <div 
              className="global-kpi-card profit-card interactive-kpi"
              onClick={() => setActiveKpiModal('profit')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div className="kpi-icon-wrapper">💰</div>
              <div className="kpi-content">
                <span className="kpi-label">{t('dashboard.totalCompanyProfit')}</span>
                <strong className="kpi-value profit-value">{formatCurrency(totalCompanyProfit)}</strong>
                <small className="kpi-subtext">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>

            {/* KPI 2: Hours */}
            <div 
              className="global-kpi-card hours-card interactive-kpi"
              onClick={() => setActiveKpiModal('hours')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div className="kpi-icon-wrapper">⏱️</div>
              <div className="kpi-content">
                <span className="kpi-label">{t('dashboard.totalHoursWorked')}</span>
                <strong className="kpi-value">{totalCompanyHours} hrs</strong>
                <small className="kpi-subtext">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>

            {/* KPI 3: Active Projects */}
            <div 
              className="global-kpi-card active-card interactive-kpi"
              onClick={() => setActiveKpiModal('active')}
              title={t('dashboard.clickToActiveList')}
            >
              <div className="kpi-icon-wrapper">🏗️</div>
              <div className="kpi-content">
                <span className="kpi-label">{t('dashboard.activeProjects')}</span>
                <strong className="kpi-value">{activeProjectsCount}</strong>
                <small className="kpi-subtext">{t('dashboard.clickToActiveList')}</small>
              </div>
            </div>

            {/* KPI 4: Contract Volume */}
            <div 
              className="global-kpi-card volume-card interactive-kpi"
              onClick={() => setActiveKpiModal('volume')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div className="kpi-icon-wrapper">📈</div>
              <div className="kpi-content">
                <span className="kpi-label">{t('dashboard.totalContractVolume')}</span>
                <strong className="kpi-value">{formatCurrency(totalContractVolume)}</strong>
                <small className="kpi-subtext">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. PROJECTS SECTION */}
      <div className="dashboard-header">
        <div>
          <h2 className="projects-heading">{t('dashboard.clientProjectsTitle')}</h2>
          <p className="projects-subheading">
            {isAdmin 
              ? t('dashboard.clientProjectsSubAdmin')
              : t('dashboard.clientProjectsSubWorker')}
          </p>
        </div>
        <button className="create-btn" onClick={handleOpenCreateModal}>
          {t('dashboard.createNewProjectBtn')}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <p>{t('common.loading')}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-card">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
          <h3>{t('dashboard.noProjectsFoundTitle')}</h3>
          <p>{t('dashboard.noProjectsFoundText')}</p>
          <button className="create-btn" style={{ marginTop: '1rem' }} onClick={handleOpenCreateModal}>
            {t('dashboard.createNewProjectBtn')}
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <ProjectCard 
              key={project.project_id || project.id} 
              project={project} 
              onSelectProject={onSelectProject}
              onEditProject={isAdmin ? handleOpenEditModal : null}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Project Creation/Edit Modal */}
      {isModalOpen && (
        <NewProjectModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingProject(null);
          }}
          onProjectCreated={handleProjectSaved}
          projectToEdit={editingProject}
        />
      )}

      {/* KPI Summary Drill-Down Modal (Admin only) */}
      {isAdmin && activeKpiModal && (
        <KpiSummaryModal
          kpiType={activeKpiModal}
          projects={projects}
          onClose={() => setActiveKpiModal(null)}
          onSelectProject={onSelectProject}
        />
      )}
    </div>
  );
}
