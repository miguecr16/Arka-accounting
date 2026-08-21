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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      setIsMobileMenuOpen(false);
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
    setIsMobileMenuOpen(false);
    setSelectedProjectId(projectId);
    setCurrentView('project-details');
  };

  const handleBackToDashboard = () => {
    setIsMobileMenuOpen(false);
    setSelectedProjectId(null);
    setCurrentView('dashboard');
  };

  const handleOpenTeamSettings = () => {
    setIsMobileMenuOpen(false);
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
      {/* =========================================================
          TOP RESPONSIVE STUDIO NAVBAR
          ========================================================= */}
      <header className="app-main-header">
        {/* Brand Logo */}
        <div 
          onClick={handleBackToDashboard}
          className="header-brand-wrapper"
          title="Arka Design Group - Home"
        >
          <img 
            src="/arka-logo.png" 
            alt="Arka Design Group" 
            className="header-brand-logo"
          />
        </div>

        {/* Desktop Navigation Links & Actions (hidden on mobile via CSS) */}
        <div className="header-desktop-actions">
          {/* Back button when inside subviews */}
          {currentView !== 'dashboard' && (
            <button 
              onClick={handleBackToDashboard}
              className="nav-action-btn back-nav-btn"
            >
              {t('common.backToProjects')}
            </button>
          )}

          {/* Admin Organization & Activity Link */}
          {isAdmin && currentView !== 'team-settings' && (
            <button
              onClick={handleOpenTeamSettings}
              title="View Organization & Activity History"
              className="nav-action-btn org-nav-btn"
            >
              {t('nav.organization')}
            </button>
          )}

          {/* Bilingual Language Switcher Toggle */}
          <div className="header-lang-toggle">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`lang-btn ${language === 'es' ? 'active' : ''}`}
              title="Cambiar a Español"
            >
              ES
            </button>
          </div>

          {/* Role Pill */}
          <span className={`header-role-badge ${isAdmin ? 'admin' : 'trabajador'}`}>
            {isAdmin ? t('common.adminRole') : t('common.trabajadorRole')}
          </span>

          {/* User Email Pill */}
          <div className="header-user-badge">
            <span className="user-status-dot"></span>
            <span className="user-email-text">{userEmail}</span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            title={t('nav.signOut')}
            className="header-signout-btn"
          >
            {t('nav.signOut')}
          </button>
        </div>

        {/* Mobile Header Right Items (Language Switcher & Hamburger Toggle) */}
        <div className="header-mobile-controls">
          <div className="header-lang-toggle">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`lang-btn ${language === 'es' ? 'active' : ''}`}
            >
              ES
            </button>
          </div>

          {/* Hamburger Menu Button */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* =========================================================
          MOBILE SLIDE-OUT NAVIGATION DRAWER & OVERLAY
          ========================================================= */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-drawer-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="mobile-drawer-header">
              <img 
                src="/arka-logo.png" 
                alt="Arka Design Group" 
                style={{ height: '48px', objectFit: 'contain' }}
              />
              <button 
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* User Session Info */}
            <div className="mobile-drawer-user-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="user-status-dot"></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{userEmail}</span>
              </div>
              <span className={`header-role-badge ${isAdmin ? 'admin' : 'trabajador'}`}>
                {isAdmin ? t('common.adminRole') : t('common.trabajadorRole')}
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="mobile-drawer-nav">
              <button
                type="button"
                className={`mobile-nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={handleBackToDashboard}
              >
                📁 {t('dashboard.clientProjectsTitle')}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={`mobile-nav-link ${currentView === 'team-settings' ? 'active' : ''}`}
                  onClick={handleOpenTeamSettings}
                >
                  🏢 {t('nav.organization')}
                </button>
              )}
            </nav>

            {/* Drawer Footer Actions */}
            <div className="mobile-drawer-footer">
              <button
                type="button"
                onClick={handleSignOut}
                className="mobile-drawer-signout-btn"
              >
                {t('nav.signOut')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="app-main-content">
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
