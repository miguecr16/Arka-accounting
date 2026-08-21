import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logAuditEvent } from '../utils/auditLogger';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ArrowLeft, RotateCw, Users, History, Lock, CheckCircle2 } from 'lucide-react';
import './TeamSettings.css';
import './ProjectDetails.css';

export default function TeamSettings({ onBack, userRole = 'trabajador' }) {
  const { t, language } = useLanguage();
  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState('organization'); // 'organization' | 'activity'
  const [profiles, setProfiles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [successToast, setSuccessToast] = useState('');
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

  const handleRoleChange = async (userId, newRole, userEmail, userFullName) => {
    setUpdatingUserId(userId);
    setSuccessToast('');
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log audit event
      const displayName = userFullName || userEmail?.split('@')[0] || userEmail;
      await logAuditEvent({
        action: 'Actualizó Rol',
        entity: 'Usuario',
        details: `Cambió rol de ${displayName} (${userEmail}) a "${newRole.toUpperCase()}"`
      });

      // Update local state immediately
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );

      setSuccessToast(t('teamSettings.roleUpdatedToast') || 'Role updated successfully!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', {
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
    if (a.includes('rol') || a.includes('role')) return 'crear';
    if (a.includes('estado') || a.includes('status')) return 'estado';
    if (a.includes('aprobó') || a.includes('aprobar') || a.includes('approve')) return 'aprobar';
    return 'general';
  };

  // Access Guard for Non-Admins
  if (!isAdmin) {
    return (
      <div className="team-settings-container">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t('common.backToDashboard')}</span>
        </button>
        <div className="access-denied-card">
          <div style={{ color: '#ef4444', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <Lock size={44} strokeWidth={1.25} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1.25rem' }}>
            {t('teamSettings.accessRestrictedTitle')}
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            {t('teamSettings.accessRestrictedText')}
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
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t('common.backToDashboard')}</span>
        </button>
        <button className="refresh-btn" onClick={loadAllData} disabled={loading}>
          <RotateCw size={15} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
          <span>{t('common.refresh')}</span>
        </button>
      </div>

      <div className="team-title-area">
        <h2>{t('teamSettings.title')}</h2>
        <p>{t('teamSettings.subtitle')}</p>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {successToast && (
        <div className="alert success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} strokeWidth={1.5} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'organization' ? 'active' : ''}`}
          onClick={() => setActiveTab('organization')}
        >
          <Users size={16} strokeWidth={1.5} />
          <span>{t('teamSettings.tabOrganization')}</span>
          <span className="tab-count">{profiles.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <History size={16} strokeWidth={1.5} />
          <span>{t('teamSettings.tabActivity')}</span>
          <span className="tab-count">{auditLogs.length}</span>
        </button>
      </div>

      {/* TAB 1: Organization (Team Members from `profiles`) */}
      {activeTab === 'organization' && (
        <div>
          <div className="section-header-actions">
            <h3>{t('teamSettings.regMembersTitle')}</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {t('teamSettings.regMembersSub')}
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('teamSettings.colFullName')}</th>
                  <th>{t('teamSettings.colUserEmail')}</th>
                  <th>{t('teamSettings.colRolePerms')}</th>
                  <th>{t('teamSettings.colJoinDate')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">
                      {t('teamSettings.noMembersFound')}
                    </td>
                  </tr>
                ) : (
                  profiles.map((user) => {
                    const currentRole = (user.role || 'trabajador').toLowerCase();
                    const isUpdatingThisUser = updatingUserId === user.id;

                    return (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.full_name || user.email?.split('@')[0] || 'N/A'}</strong>
                        </td>
                        <td>
                          <span style={{ color: '#475569' }}>{user.email}</span>
                        </td>
                        <td>
                          {/* In-App Interactive Role Management Dropdown */}
                          <select
                            value={currentRole}
                            onChange={(e) => handleRoleChange(user.id, e.target.value, user.email, user.full_name)}
                            disabled={isUpdatingThisUser}
                            className={`role-select-input ${currentRole === 'admin' ? 'admin' : 'trabajador'}`}
                            title="Click to modify member permissions"
                          >
                            <option value="trabajador">{t('teamSettings.roleWorker') || 'Worker'}</option>
                            <option value="admin">{t('teamSettings.roleAdmin') || 'Admin'}</option>
                          </select>
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
            <h3>{t('teamSettings.auditTrailTitle')}</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {t('teamSettings.auditTrailSub')}
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>{t('teamSettings.colTimestamp')}</th>
                  <th style={{ width: '22%' }}>{t('teamSettings.colUserEmail')}</th>
                  <th style={{ width: '12%' }}>{t('teamSettings.colAction')}</th>
                  <th style={{ width: '14%' }}>{t('teamSettings.colEntity')}</th>
                  <th style={{ width: '34%' }}>{t('teamSettings.colDetails')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">
                      {t('teamSettings.noActivityFound')}
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
