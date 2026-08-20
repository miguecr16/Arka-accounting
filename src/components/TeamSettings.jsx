import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './TeamSettings.css';
import './ProjectDetails.css';

export default function TeamSettings({ onBack, userRole = 'trabajador' }) {
  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState('organization'); // 'organization' | 'activity'
  const [profiles, setProfiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfiles = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Could not load team profiles.');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Could not load audit activity logs.');
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    await Promise.all([fetchProfiles(), fetchAuditLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadgeClass = (action) => {
    const a = (action || '').toLowerCase();
    if (a.includes('creó') || a.includes('crear') || a.includes('create')) return 'crear';
    if (a.includes('editó') || a.includes('editar') || a.includes('update')) return 'editar';
    if (a.includes('estado') || a.includes('status')) return 'estado';
    if (a.includes('aprobó') || a.includes('aprobar') || a.includes('approve')) return 'aprobar';
    return 'general';
  };

  // Access Guard for Non-Admins
  if (!isAdmin) {
    return (
      <div className="team-settings-container">
        <button className="back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div className="access-denied-card">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1.25rem' }}>
            Access Restricted
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            The Organization & Activity dashboard is strictly reserved for administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-settings-container">
      {/* Navigation Header */}
      <div className="team-header-nav">
        <button className="back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <button className="refresh-btn" onClick={loadAllData} disabled={loading}>
          🔄 Refresh Data
        </button>
      </div>

      <div className="team-title-area">
        <h2>Organization & Activity</h2>
        <p>Manage team member permissions and inspect the real-time global audit trail.</p>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveTab('organization')}
        >
          🏢 Organization (Team) <span className="tab-count">{profiles.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          📋 Activity History (Audit Logs) <span className="tab-count">{auditLogs.length}</span>
        </button>
      </div>

      {/* TAB 1: Organization (Team Members from `profiles`) */}
      {activeTab === 'organization' && (
        <div>
          <div className="section-header-actions">
            <h3>Registered Team Members</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Roles dictate editing and status permission access across the platform.
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Role / Permissions</th>
                  <th>User ID</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      Loading team profiles...
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      No team members found in profiles table.
                    </td>
                  </tr>
                ) : (
                  profiles.map((user) => {
                    const isUserAdmin = (user.role || '').toLowerCase() === 'admin';

                    return (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.email}</strong>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: isUserAdmin ? '#0f172a' : '#f1f5f9',
                            color: isUserAdmin ? '#ffffff' : '#475569',
                            border: isUserAdmin ? '1px solid #0f172a' : '1px solid #cbd5e1',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            display: 'inline-block'
                          }}>
                            {isUserAdmin ? '🛡️ Admin' : '👤 Trabajador'}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                            {user.id}
                          </code>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.9rem' }}>
                          {formatDate(user.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Activity History (Feed from `audit_logs`) */}
      {activeTab === 'activity' && (
        <div>
          <div className="section-header-actions">
            <h3>Global Audit Trail</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Real-time records of all creations, updates, and status modifications.
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Timestamp</th>
                  <th style={{ width: '22%' }}>User Email</th>
                  <th style={{ width: '12%' }}>Action</th>
                  <th style={{ width: '14%' }}>Entity</th>
                  <th style={{ width: '34%' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">
                      No activity logs recorded yet. Changes will appear here in real-time.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <strong>{log.user_email || 'Unknown'}</strong>
                      </td>
                      <td>
                        <span className={`audit-action-badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="entity-tag">{log.entity}</span>
                      </td>
                      <td style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
