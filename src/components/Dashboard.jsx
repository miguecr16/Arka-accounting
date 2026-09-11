import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatToUSD } from '../utils/currencyFormatter.js';
import ProjectCard from './ProjectCard.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import KpiSummaryModal from './KpiSummaryModal.jsx';
import { DollarSign, Clock, HardHat, TrendingUp, PlusCircle, FolderOpen, Wallet } from 'lucide-react';
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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch strictly from the projects_dashboard_view
      const { data, error: dbError } = await supabase
        .from('projects_dashboard_view')
        .select('*');

      if (dbError) throw dbError;

      let mergedData = data || [];

      // 2. Fetch project deposits and payments concurrently to compute total_collected per project
      try {
        const [projectsRes, paymentsRes] = await Promise.all([
          supabase.from('projects').select('id, deposit_received'),
          supabase.from('project_payments').select('project_id, amount')
        ]);

        const depositMap = {};
        (projectsRes.data || []).forEach((p) => {
          depositMap[p.id] = parseFloat(p.deposit_received) || 0;
        });

        const paymentsMap = {};
        (paymentsRes.data || []).forEach((pm) => {
          const pid = pm.project_id;
          if (pid) {
            paymentsMap[pid] = (paymentsMap[pid] || 0) + (parseFloat(pm.amount) || 0);
          }
        });

        mergedData = mergedData.map((proj) => {
          const targetId = proj.project_id || proj.id;
          const deposit = depositMap[targetId] !== undefined 
            ? depositMap[targetId] 
            : (parseFloat(proj.deposit_received) || 0);
          const paymentsSum = paymentsMap[targetId] || 0;
          return {
            ...proj,
            deposit_received: deposit,
            total_collected: deposit + paymentsSum
          };
        });
      } catch (calcErr) {
        console.warn('Could not fetch payments/deposits for dashboard:', calcErr);
      }
      
      const sortedData = mergedData.sort((a, b) => 
        (a.project_name || '').localeCompare(b.project_name || '')
      );
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
  }, [userRole]);

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
    (acc, p) => acc + (parseFloat(p.final_contract_value || p.base_contract_value) || 0),
    0
  );

  const totalPendingBalance = projects.reduce((acc, p) => {
    const finalContract = parseFloat(p.final_contract_value || p.base_contract_value) || 0;
    const collected = parseFloat(p.total_collected) || 0;
    return acc + (finalContract - collected);
  }, 0);

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
              <h2 className="overview-title" style={{ fontFamily: 'var(--font-display)' }}>{t('dashboard.globalOverviewTitle')}</h2>
              <p className="overview-subtitle">{t('dashboard.globalOverviewSubtitle')}</p>
            </div>
            <div className="studio-pill">{t('dashboard.studioPill')}</div>
          </div>

          <div className="global-kpi-grid flex flex-wrap gap-4 md:gap-6">
            {/* KPI 1: Contract Volume (Primary / First) */}
            <div 
              className="global-kpi-card volume-card interactive-kpi flex-1 min-w-[260px] p-4 md:p-6"
              onClick={() => setActiveKpiModal('volume')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div className="kpi-icon-wrapper">
                <TrendingUp size={18} strokeWidth={1.5} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label min-h-[2.5rem] flex items-center leading-tight">{t('dashboard.totalContractVolume')}</span>
                <strong className="kpi-value text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>{formatToUSD(totalContractVolume)}</strong>
                <small className="kpi-subtext text-xs text-gray-400 mt-2 block">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>

            {/* KPI 2: Total Pending Balance */}
            <div 
              className="global-kpi-card pending-card interactive-kpi flex-1 min-w-[260px] p-4 md:p-6"
              onClick={() => setActiveKpiModal('pending')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div 
                className="kpi-icon-wrapper"
                style={{
                  color: totalPendingBalance > 0 ? '#D97706' : 'var(--arka-gold)',
                  background: totalPendingBalance > 0 ? '#FEF3C7' : '#FBF8F0'
                }}
              >
                <Wallet size={18} strokeWidth={1.5} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label min-h-[2.5rem] flex items-center leading-tight">{t('dashboard.totalPendingBalance')}</span>
                <strong 
                  className="kpi-value text-2xl md:text-3xl" 
                  style={{ 
                    fontFamily: 'var(--font-display)',
                    color: totalPendingBalance > 0 ? '#D97706' : '#1B7A4A'
                  }}
                >
                  {formatToUSD(totalPendingBalance)}
                </strong>
                <small className="kpi-subtext text-xs text-gray-400 mt-2 block">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>

            {/* KPI 3: Profit */}
            <div 
              className="global-kpi-card profit-card interactive-kpi flex-1 min-w-[260px] p-4 md:p-6"
              onClick={() => setActiveKpiModal('profit')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div className="kpi-icon-wrapper">
                <DollarSign size={18} strokeWidth={1.5} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label min-h-[2.5rem] flex items-center leading-tight">{t('dashboard.totalCompanyProfit')}</span>
                <strong className="kpi-value profit-value text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>{formatToUSD(totalCompanyProfit)}</strong>
                <small className="kpi-subtext text-xs text-gray-400 mt-2 block">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>

            {/* KPI 4: Hours */}
            <div 
              className="global-kpi-card hours-card interactive-kpi flex-1 min-w-[260px] p-4 md:p-6"
              onClick={() => setActiveKpiModal('hours')}
              title={t('dashboard.clickToBreakdown')}
            >
              <div className="kpi-icon-wrapper">
                <Clock size={18} strokeWidth={1.5} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label min-h-[2.5rem] flex items-center leading-tight">{t('dashboard.totalHoursWorked')}</span>
                <strong className="kpi-value text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>{totalCompanyHours} hrs</strong>
                <small className="kpi-subtext text-xs text-gray-400 mt-2 block">{t('dashboard.clickToBreakdown')}</small>
              </div>
            </div>

            {/* KPI 5: Active Projects */}
            <div 
              className="global-kpi-card active-card interactive-kpi flex-1 min-w-[260px] p-4 md:p-6"
              onClick={() => setActiveKpiModal('active')}
              title={t('dashboard.clickToActiveList')}
            >
              <div className="kpi-icon-wrapper">
                <HardHat size={18} strokeWidth={1.5} />
              </div>
              <div className="kpi-content">
                <span className="kpi-label min-h-[2.5rem] flex items-center leading-tight">{t('dashboard.activeProjects')}</span>
                <strong className="kpi-value text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>{activeProjectsCount}</strong>
                <small className="kpi-subtext text-xs text-gray-400 mt-2 block">{t('dashboard.clickToActiveList')}</small>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. PROJECTS SECTION */}
      <div className="dashboard-header">
        <div>
          <h2 className="projects-heading" style={{ fontFamily: 'var(--font-display)' }}>{t('dashboard.clientProjectsTitle')}</h2>
          <p className="projects-subheading">
            {isAdmin 
              ? t('dashboard.clientProjectsSubAdmin')
              : t('dashboard.clientProjectsSubWorker')}
          </p>
        </div>
        <button className="create-btn" onClick={handleOpenCreateModal}>
          <PlusCircle size={18} strokeWidth={1.5} />
          <span>{t('dashboard.createNewProjectBtn')}</span>
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <p>{t('common.loading')}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-card">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FolderOpen size={44} strokeWidth={1.25} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)' }}>{t('dashboard.noProjectsFoundTitle')}</h3>
          <p>{t('dashboard.noProjectsFoundText')}</p>
          <button className="create-btn" style={{ marginTop: '16px' }} onClick={handleOpenCreateModal}>
            <PlusCircle size={18} strokeWidth={1.5} />
            <span>{t('dashboard.createNewProjectBtn')}</span>
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
