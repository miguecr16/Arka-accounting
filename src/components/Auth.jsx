import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Auth.css';

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });

        if (authError) throw authError;

        if (data?.session && onAuthSuccess) {
          onAuthSuccess(data.session);
        } else {
          setMessage('Account created! Please check your email for a confirmation link (if email verification is enabled in Supabase) or sign in directly.');
          setMode('login');
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
      <div className="auth-card">
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-badge">ARKA</div>
          <h2 className="auth-brand-title">Arka Design OS</h2>
          <p className="auth-brand-subtitle">
            {mode === 'login' ? 'Sign in to your architecture & job costing studio' : 'Create an account for your studio'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="auth-mode-toggle">
          <button
            type="button"
            className={`auth-toggle-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-toggle-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
              setMessage('');
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              type="email"
              id="auth-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="architect@arkadesign.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              type="password"
              id="auth-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
              ? (mode === 'login' ? 'Signing in...' : 'Creating account...') 
              : (mode === 'login' ? 'Sign In to Studio' : 'Create Account')}
          </button>
        </form>

        <div className="auth-footer-text">
          Protected by Supabase Row-Level Security (RLS)
        </div>
      </div>
    </div>
  );
}
