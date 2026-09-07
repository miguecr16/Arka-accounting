import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../context/LanguageContext.jsx';
import './Auth.css';

export default function Auth({ onAuthSuccess }) {
  const { t, language, setLanguage } = useLanguage();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleToggleMode = (newMode) => {
    setMode(newMode);
    // Explicitly reset form state variables on toggle for security
    setFullName('');
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
        // Sign Up with Full Name
        const cleanEmail = email.trim();
        const cleanFullName = fullName.trim();

        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanFullName
            }
          }
        });

        if (authError) throw authError;

        // Insert / update new user profile in the `profiles` table
        if (data?.user) {
          try {
            await supabase
              .from('profiles')
              .upsert([
                {
                  id: data.user.id,
                  email: cleanEmail,
                  full_name: cleanFullName,
                  role: 'trabajador'
                }
              ]);
          } catch (profileErr) {
            console.warn('Profile insertion error (may be handled by DB trigger):', profileErr);
          }

          try {
            await supabase
              .from('organization_members')
              .upsert([
                {
                  organization_id: 'a0000000-0000-0000-0000-000000000001',
                  user_id: data.user.id,
                  role: 'trabajador'
                }
              ], { onConflict: 'organization_id, user_id' });
          } catch (orgMemErr) {
            console.warn('Organization member insertion error:', orgMemErr);
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
      <div className="auth-lang-toggle">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`auth-lang-btn ${language === 'en' ? 'active' : ''}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('es')}
          className={`auth-lang-btn ${language === 'es' ? 'active' : ''}`}
        >
          ES
        </button>
      </div>

      <div className="auth-card">
        {/* Official Brand Header with Golden Logo */}
        <div className="auth-brand-header">
          <img 
            src="/arka-logo.png" 
            alt="Arka Design Group" 
            className="auth-logo"
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
          {/* Full Name field (Register Mode Only) */}
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-fullname">{t('auth.fullNameLabel')}</label>
              <input
                type="text"
                id="auth-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">{t('auth.emailLabel')}</label>
            <input
              type="email"
              id="auth-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
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
