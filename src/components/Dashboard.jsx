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

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (projectSummary) => {
    try {
      const targetId = projectSummary.project_id || projectSummary.id;
      // Fetch full project record from projects table to get scope_details JSONB
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
      // Fallback to summary object if fetch fails
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
      <div className="dashboard-header">
        <h2>Your Projects</h2>
        <button className="create-btn" onClick={handleOpenCreateModal}>
          + Create New Project
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects found. Create one to get started!</p>
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
