import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../context/LanguageContext.jsx';
import './Auth.css';

export default function Auth({ onAuthSuccess }) {
  const { t, language, setLanguage } = useLanguage();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleToggleMode = (newMode) => {
    setMode(newMode);
    // Explicitly reset email and password state variables on toggle for security
    setEmail('');
    setPassword('');
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Supabase client not initialized.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (authError) throw authError;

        if (data?.session && onAuthSuccess) {
          onAuthSuccess(data.session);
        }
      } else {
        // Sign Up
        const cleanEmail = email.trim();
        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password
        });

        if (authError) throw authError;

        // Insert new user profile into the `profiles` table
        if (data?.user) {
          try {
            await supabase
              .from('profiles')
              .insert([
                {
                  id: data.user.id,
                  email: cleanEmail
                }
              ]);
          } catch (profileErr) {
            console.warn('Profile insertion error (may be handled by DB trigger):', profileErr);
          }
        }

        if (data?.session && onAuthSuccess) {
          onAuthSuccess(data.session);
        } else {
          setMessage(t('auth.accountCreatedMsg'));
          handleToggleMode('login');
        }
      }
    } catch (err) {
      console.error('Auth Error:', err);
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Top right language switch on Auth page */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: '9999px',
          padding: '0.2rem',
          border: '1px solid #cbd5e1',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
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
          >
            ES
          </button>
        </div>
      </div>

      <div className="auth-card">
        {/* Official Brand Header with Golden Logo */}
        <div className="auth-brand-header">
          <img 
            src="/arka-logo.png" 
            alt="Arka Design Group" 
            style={{
              height: '92px',
              maxWidth: '240px',
              objectFit: 'contain',
              marginBottom: '0.75rem'
            }}
          />
          <p className="auth-brand-subtitle">
            {mode === 'login' ? t('auth.signInSubtitle') : t('auth.createAccountSubtitle')}
          </p>
        </div>

        {/* Mode Toggle with Explicit State Reset */}
        <div className="auth-mode-toggle">
          <button
            type="button"
            className={`auth-toggle-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleToggleMode('login')}
          >
            {t('auth.signInTitle')}
          </button>
          <button
            type="button"
            className={`auth-toggle-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => handleToggleMode('register')}
          >
            {t('auth.createAccountTitle')}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="auth-email">{t('auth.emailLabel')}</label>
            <input
              type="email"
              id="auth-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">{t('auth.passwordLabel')}</label>
            <input
              type="password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading 
              ? (mode === 'login' ? t('auth.signingIn') : t('auth.creatingAccount')) 
              : (mode === 'login' ? t('auth.signInBtn') : t('auth.createAccountBtn'))}
          </button>
        </form>

        <div className="auth-footer-text">
          {t('auth.protectedRls')}
        </div>
      </div>
    </div>
  );
}
