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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: 0 }}>
      {/* Top Studio Navbar */}
      <header style={{ 
        padding: '1.25rem 2rem', 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
      }}>
        <div 
          onClick={handleBackToDashboard}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer'
          }}
        >
          <div style={{
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '8px',
            letterSpacing: '0.05em'
          }}>
            ARKA
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              color: '#0f172a', 
              fontSize: '1.15rem', 
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1
            }}>
              Arka Design OS
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Architecture & Job Costing Studio
            </span>
          </div>
        </div>

        {currentView === 'project-details' && (
          <button 
            onClick={handleBackToDashboard}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            ← Back to Overview
          </button>
        )}
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
