import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ProjectCard from './ProjectCard.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import KpiSummaryModal from './KpiSummaryModal.jsx';
import './Dashboard.css';

export default function Dashboard({ onSelectProject, userRole = 'trabajador' }) {
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

  // Global Company Overview calculations
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
      {/* 1. GLOBAL COMPANY OVERVIEW (INTERACTIVE EXECUTIVE KPI BANNER) */}
      <section className="global-overview-section">
        <div className="global-overview-header">
          <div>
            <h2 className="overview-title">Global Company Overview</h2>
            <p className="overview-subtitle">Click any card to drill down into project-level breakdowns</p>
          </div>
          <div className="studio-pill">Architecture & Interior Design OS</div>
        </div>

        <div className="global-kpi-grid">
          {/* KPI 1: Profit */}
          <div 
            className="global-kpi-card profit-card interactive-kpi"
            onClick={() => setActiveKpiModal('profit')}
            title="Click to view Profit drill-down"
          >
            <div className="kpi-icon-wrapper">💰</div>
            <div className="kpi-content">
              <span className="kpi-label">Total Company Profit</span>
              <strong className="kpi-value profit-value">{formatCurrency(totalCompanyProfit)}</strong>
              <small className="kpi-subtext">Click to view breakdown ↗</small>
            </div>
          </div>

          {/* KPI 2: Hours */}
          <div 
            className="global-kpi-card hours-card interactive-kpi"
            onClick={() => setActiveKpiModal('hours')}
            title="Click to view Hours drill-down"
          >
            <div className="kpi-icon-wrapper">⏱️</div>
            <div className="kpi-content">
              <span className="kpi-label">Total Hours Worked</span>
              <strong className="kpi-value">{totalCompanyHours} hrs</strong>
              <small className="kpi-subtext">Click to view breakdown ↗</small>
            </div>
          </div>

          {/* KPI 3: Active Projects */}
          <div 
            className="global-kpi-card active-card interactive-kpi"
            onClick={() => setActiveKpiModal('active')}
            title="Click to view Active Projects list"
          >
            <div className="kpi-icon-wrapper">🏗️</div>
            <div className="kpi-content">
              <span className="kpi-label">Active Projects</span>
              <strong className="kpi-value">{activeProjectsCount}</strong>
              <small className="kpi-subtext">Click to view active list ↗</small>
            </div>
          </div>

          {/* KPI 4: Contract Volume */}
          <div 
            className="global-kpi-card volume-card interactive-kpi"
            onClick={() => setActiveKpiModal('volume')}
            title="Click to view Contract Volume breakdown"
          >
            <div className="kpi-icon-wrapper">📈</div>
            <div className="kpi-content">
              <span className="kpi-label">Total Contract Volume</span>
              <strong className="kpi-value">{formatCurrency(totalContractVolume)}</strong>
              <small className="kpi-subtext">Click to view breakdown ↗</small>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROJECTS SECTION */}
      <div className="dashboard-header">
        <div>
          <h2 className="projects-heading">Client Projects</h2>
          <p className="projects-subheading">Manage job costing, specifications, and scope for each project</p>
        </div>
        {/* Creation enabled for both roles */}
        <button className="create-btn" onClick={handleOpenCreateModal}>
          + Create New Project
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <p>Loading projects & financial view...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-card">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
          <h3>No projects found</h3>
          <p>Create your first project to start tracking real-time job costing and materials.</p>
          <button className="create-btn" style={{ marginTop: '1rem' }} onClick={handleOpenCreateModal}>
            + Create New Project
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

      {/* KPI Summary Drill-Down Modal */}
      {activeKpiModal && (
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
