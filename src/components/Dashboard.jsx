import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ProjectCard from './ProjectCard.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import './Dashboard.css';

export default function Dashboard({ onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      // Fetch strictly from the view
      const { data, error: dbError } = await supabase
        .from('projects_dashboard_view')
        .select('*');

      if (dbError) throw dbError;
      
      // Sort projects by name since created_at is not in the view
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

  const handleProjectCreated = () => {
    fetchProjects(); // Re-fetch to get calculations
    setIsModalOpen(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Your Projects</h2>
        <button className="create-btn" onClick={() => setIsModalOpen(true)}>
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
              key={project.project_id} 
              project={project} 
              onSelectProject={onSelectProject} 
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewProjectModal 
          onClose={() => setIsModalOpen(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
