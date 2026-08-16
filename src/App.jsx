import { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import ProjectDetails from './components/ProjectDetails.jsx';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project-details');
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
    setCurrentView('dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '1px' }}>
      <header style={{ 
        textAlign: 'center', 
        padding: '1.25rem 1rem', 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 
          onClick={handleBackToDashboard}
          style={{ 
            margin: 0, 
            color: '#1f2937', 
            fontSize: '1.4rem', 
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.02em'
          }}
        >
          Arka Design OS
        </h1>
      </header>
      <main>
        {currentView === 'dashboard' ? (
          <Dashboard onSelectProject={handleSelectProject} />
        ) : (
          <ProjectDetails 
            projectId={selectedProjectId} 
            onBack={handleBackToDashboard} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
