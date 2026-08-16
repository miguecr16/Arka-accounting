import './Dashboard.css';

export default function ProjectCard({ project, onSelectProject }) {
  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3 className="project-name">{project.Project_Name}</h3>
        <p className="client-name">{project.Client_Name}</p>
      </div>
      <button 
        className="enter-btn"
        onClick={() => onSelectProject(project.id)}
      >
        Enter Project / Log Data
      </button>
    </div>
  );
}
