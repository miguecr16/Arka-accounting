import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './components/Dashboard.jsx';
import ProjectDetails from './components/ProjectDetails.jsx';
import Auth from './components/Auth.jsx';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Initialize and listen to Supabase Auth session
  useEffect(() => {
    // 1. Check existing active session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setAuthLoading(false);
    });

    // 2. Listen to ongoing auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setCurrentView('dashboard');
      setSelectedProjectId(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentView('project-details');
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
    setCurrentView('dashboard');
  };

  // Prevent flash while loading session
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#64748b'
      }}>
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '1.25rem',
          padding: '0.5rem 1rem',
          borderRadius: '10px',
          letterSpacing: '0.08em',
          marginBottom: '1rem'
        }}>
          ARKA
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Verifying secure session...</p>
      </div>
    );
  }

  // If not authenticated, render Login/Register Auth Screen
  if (!session) {
    return <Auth onAuthSuccess={(newSession) => setSession(newSession)} />;
  }

  // Authenticated Protected App
  const userEmail = session.user?.email || 'Authenticated User';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: 0 }}>
      {/* Top Studio Navbar with User & Sign Out */}
      <header style={{ 
        padding: '1.1rem 2rem', 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand */}
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

        {/* User Session & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {currentView === 'project-details' && (
            <button 
              onClick={handleBackToDashboard}
              style={{
                padding: '0.45rem 0.9rem',
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

          {/* User Email Pill */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 500
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            {userEmail}
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            title="Sign out of Arka Design OS"
            style={{
              padding: '0.45rem 0.9rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#ef4444',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
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
