import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ProjectCard from './ProjectCard.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import './Dashboard.css';

export default function Dashboard({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [error, setError] = useState('');

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
      {/* 1. GLOBAL COMPANY OVERVIEW (EXECUTIVE KPI BANNER) */}
      <section className="global-overview-section">
        <div className="global-overview-header">
          <div>
            <h2 className="overview-title">Global Company Overview</h2>
            <p className="overview-subtitle">Real-time studio financials and operational volume</p>
          </div>
          <div className="studio-pill">Architecture & Interior Design OS</div>
        </div>

        <div className="global-kpi-grid">
          <div className="global-kpi-card profit-card">
            <div className="kpi-icon-wrapper">💰</div>
            <div className="kpi-content">
              <span className="kpi-label">Total Company Profit</span>
              <strong className="kpi-value profit-value">{formatCurrency(totalCompanyProfit)}</strong>
              <small className="kpi-subtext">Net Gross Profit across all jobs</small>
            </div>
          </div>

          <div className="global-kpi-card hours-card">
            <div className="kpi-icon-wrapper">⏱️</div>
            <div className="kpi-content">
              <span className="kpi-label">Total Hours Worked</span>
              <strong className="kpi-value">{totalCompanyHours} hrs</strong>
              <small className="kpi-subtext">Direct field & studio labor logged</small>
            </div>
          </div>

          <div className="global-kpi-card active-card">
            <div className="kpi-icon-wrapper">🏗️</div>
            <div className="kpi-content">
              <span className="kpi-label">Active Projects</span>
              <strong className="kpi-value">{activeProjectsCount}</strong>
              <small className="kpi-subtext">In planning, progress, or paused</small>
            </div>
          </div>

          <div className="global-kpi-card volume-card">
            <div className="kpi-icon-wrapper">📈</div>
            <div className="kpi-content">
              <span className="kpi-label">Total Contract Volume</span>
              <strong className="kpi-value">{formatCurrency(totalContractVolume)}</strong>
              <small className="kpi-subtext">Cumulative signed value + extras</small>
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
              onEditProject={handleOpenEditModal}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}
