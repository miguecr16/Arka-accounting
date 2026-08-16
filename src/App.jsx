import { useState } from 'react';
import Dashboard from './components/Dashboard.jsx'
import NewExpenseForm from './components/NewExpenseForm.jsx'

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('expense-form');
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
    setCurrentView('dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '1px' }}>
      <header style={{ 
        textAlign: 'center', 
        padding: '2rem 1rem', 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <h1 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem' }}>Arka Design OS</h1>
        {currentView === 'expense-form' && (
          <button 
            onClick={handleBackToDashboard}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            ← Back to Dashboard
          </button>
        )}
      </header>
      <main>
        {currentView === 'dashboard' ? (
          <Dashboard onSelectProject={handleSelectProject} />
        ) : (
          <NewExpenseForm projectId={selectedProjectId} />
        )}
      </main>
    </div>
  )
}

export default App
