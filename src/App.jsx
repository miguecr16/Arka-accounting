import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import Dashboard from './components/Dashboard.jsx';
import ProjectDetails from './components/ProjectDetails.jsx';
import TeamSettings from './components/TeamSettings.jsx';
import Auth from './components/Auth.jsx';

function AppContent() {
  const { language, setLanguage, t } = useLanguage();
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('trabajador'); // 'admin' | 'trabajador'
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'project-details' | 'team-settings'
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const fetchUserRole = async (userId) => {
    try {
      if (!userId) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Could not fetch user profile role, defaulting to trabajador:', error.message);
        setUserRole('trabajador');
      } else if (profile?.role) {
        setUserRole(profile.role.toLowerCase());
      }
    } catch (err) {
      console.warn('Role fetch error:', err);
      setUserRole('trabajador');
    }
  };

  // Initialize and listen to Supabase Auth session
  useEffect(() => {
    // 1. Check existing active session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user?.id) {
        fetchUserRole(existingSession.user.id);
      }
      setAuthLoading(false);
    });

    // 2. Listen to ongoing auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        fetchUserRole(newSession.user.id);
      } else {
        setUserRole('trabajador');
      }
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
      setUserRole('trabajador');
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

  const handleOpenTeamSettings = () => {
    setSelectedProjectId(null);
    setCurrentView('team-settings');
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
        <img 
          src="/arka-logo.png" 
          alt="Arka Design Group" 
          style={{
            height: '76px',
            maxWidth: '220px',
            objectFit: 'contain',
            marginBottom: '1.25rem'
          }}
        />
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
          {language === 'es' ? 'Verificando sesión segura y permisos...' : 'Verifying secure session & permissions...'}
        </p>
      </div>
    );
  }

  // If not authenticated, render Login/Register Auth Screen
  if (!session) {
    return (
      <Auth 
        onAuthSuccess={(newSession) => {
          setSession(newSession);
          if (newSession?.user?.id) {
            fetchUserRole(newSession.user.id);
          }
        }} 
      />
    );
  }

  // Authenticated Protected App
  const userEmail = session.user?.email || 'Authenticated User';
  const isAdmin = userRole === 'admin';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: 0 }}>
      {/* Top Studio Navbar with Arka Design Group Branding and Language Switcher */}
      <header style={{ 
        padding: '0.85rem 2rem', 
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
            cursor: 'pointer'
          }}
          title="Arka Design Group - Home"
        >
          <img 
            src="/arka-logo.png" 
            alt="Arka Design Group" 
            style={{
              height: '54px',
              maxWidth: '180px',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* User Session & Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Back button when inside subviews */}
          {currentView !== 'dashboard' && (
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
              {t('common.backToProjects')}
            </button>
          )}

          {/* Admin Organization & Activity Link */}
          {isAdmin && currentView !== 'team-settings' && (
            <button
              onClick={handleOpenTeamSettings}
              title="View Organization & Activity History"
              style={{
                padding: '0.45rem 0.9rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
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
              {t('nav.organization')}
            </button>
          )}

          {/* Bilingual Language Switcher Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#f1f5f9',
            borderRadius: '9999px',
            padding: '0.2rem',
            border: '1px solid #cbd5e1'
          }}>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                background: language === 'en' ? '#0f172a' : 'transparent',
                color: language === 'en' ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '0.25rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              style={{
                background: language === 'es' ? '#0f172a' : 'transparent',
                color: language === 'es' ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '0.25rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Cambiar a Español"
            >
              ES
            </button>
          </div>

          {/* Role Pill */}
          <span style={{
            backgroundColor: isAdmin ? '#0f172a' : '#f1f5f9',
            color: isAdmin ? '#ffffff' : '#475569',
            border: isAdmin ? '1px solid #0f172a' : '1px solid #cbd5e1',
            padding: '0.3rem 0.7rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            {isAdmin ? t('common.adminRole') : t('common.trabajadorRole')}
          </span>

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
            title={t('nav.signOut')}
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
            {t('nav.signOut')}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {currentView === 'dashboard' && (
          <Dashboard 
            onSelectProject={handleSelectProject} 
            userRole={userRole} 
          />
        )}
        {currentView === 'project-details' && (
          <ProjectDetails 
            projectId={selectedProjectId} 
            onBack={handleBackToDashboard} 
            userRole={userRole} 
          />
        )}
        {currentView === 'team-settings' && (
          <TeamSettings
            onBack={handleBackToDashboard}
            userRole={userRole}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
