import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useOrganization } from '../context/OrganizationContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { logAuditEvent } from '../utils/auditLogger';
import {
  Building2,
  ArrowLeft,
  RotateCw,
  Save,
  Upload,
  Trash2,
  Palette,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  Mail,
  Phone,
  MapPin,
  Eye,
  ShieldCheck
} from 'lucide-react';
import './CompanySettings.css';

const COLOR_PRESETS = [
  { label: 'Arka Gold', hex: '#C9A45C' },
  { label: 'Sapphire Navy', hex: '#1E3A8A' },
  { label: 'Emerald Green', hex: '#059669' },
  { label: 'Crimson Amber', hex: '#DC2626' },
  { label: 'Slate Gray', hex: '#475569' },
  { label: 'Royal Violet', hex: '#7C3AED' },
  { label: 'Onyx Charcoal', hex: '#18181B' },
  { label: 'Amber Ochre', hex: '#D97706' }
];

export default function CompanySettings({ onBack, userRole = 'trabajador' }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { organization, organizationId, refreshOrganization, updateOrganizationLocally } = useOrganization();
  const isAdmin = userRole === 'admin';

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    invoice_terms: '',
    primary_color: '#C9A45C',
    logo_url: null
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // Sync form data with current organization context
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        address: organization.address || '',
        phone: organization.phone || '',
        email: organization.email || '',
        website: organization.website || '',
        invoice_terms: organization.invoice_terms || '',
        primary_color: organization.primary_color || '#C9A45C',
        logo_url: organization.logo_url || null
      });
      setLogoRemoved(false);
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
    }
  }, [organization]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleColorPresetSelect = (hex) => {
    setFormData((prev) => ({ ...prev, primary_color: hex }));
  };

  // Immediate thumbnail preview on file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    const isValid = validTypes.includes(file.type) || /\.(jpe?g|png|svg|webp)$/i.test(file.name);
    if (!isValid) {
      setErrorMessage(language === 'es' ? 'Por favor selecciona un archivo de imagen válido (JPG, PNG, SVG).' : 'Please select a valid image file (JPG, PNG, SVG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(language === 'es' ? 'El tamaño de la imagen no debe superar los 5 MB.' : 'Image size cannot exceed 5 MB.');
      return;
    }

    setErrorMessage('');
    setSelectedLogoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(objectUrl);
    setLogoRemoved(false);
  };

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoRemoved(true);
    setFormData((prev) => ({ ...prev, logo_url: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    setSuccessToast('');

    try {
      let targetId = organizationId || organization?.id;
      if (!targetId) {
        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        if (orgs && orgs.length > 0) targetId = orgs[0].id;
      }

      if (!targetId) {
        throw new Error('No active organization identified.');
      }

      let finalLogoUrl = formData.logo_url;

      // Upload logo to Supabase Storage bucket under path ${organization.id}/logo_${Date.now()}
      if (selectedLogoFile) {
        setIsUploadingLogo(true);
        try {
          const fileExt = selectedLogoFile.name.split('.').pop() || 'png';
          const filePath = `${targetId}/logo_${Date.now()}.${fileExt}`;

          let bucketName = 'organization-logos';
          let uploadRes = await supabase.storage
            .from(bucketName)
            .upload(filePath, selectedLogoFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: selectedLogoFile.type || undefined
            });

          // Fallback to imagenes_arka if organization-logos is not configured
          if (uploadRes.error) {
            console.warn('Upload to organization-logos failed, attempting fallback to imagenes_arka:', uploadRes.error.message);
            bucketName = 'imagenes_arka';
            uploadRes = await supabase.storage
              .from(bucketName)
              .upload(filePath, selectedLogoFile, {
                cacheControl: '3600',
                upsert: true,
                contentType: selectedLogoFile.type || undefined
              });
          }

          if (uploadRes.error) {
            throw new Error(uploadRes.error.message);
          }

          const { data: publicData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (!publicData?.publicUrl) {
            throw new Error('Could not retrieve public URL for uploaded logo.');
          }

          finalLogoUrl = publicData.publicUrl;
        } finally {
          setIsUploadingLogo(false);
        }
      } else if (logoRemoved) {
        finalLogoUrl = null;
      }

      const payload = {
        name: formData.name.trim() || 'Arka Design Group',
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        website: formData.website.trim(),
        invoice_terms: formData.invoice_terms.trim(),
        primary_color: formData.primary_color || '#C9A45C',
        logo_url: finalLogoUrl,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('organizations')
        .update(payload)
        .eq('id', targetId);

      if (updateError) {
        throw updateError;
      }

      // Real-time zero-latency update across UI + background refresh
      updateOrganizationLocally(payload);
      await refreshOrganization();

      setFormData((prev) => ({ ...prev, ...payload }));
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoRemoved(false);

      // Dispatch audit event
      await logAuditEvent({
        action: 'Actualizó Empresa',
        entity: 'Organización',
        details: `Actualizó el perfil y marca de "${payload.name}"`
      });

      setSuccessToast(t('companySettings.saveSuccess'));
      setTimeout(() => setSuccessToast(''), 5000);
    } catch (err) {
      console.error('Error updating company settings:', err);
      setErrorMessage(err.message || t('companySettings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Access Guard for Non-Admins
  if (!isAdmin) {
    return (
      <div className="company-settings-container">
        <button className="back-btn" onClick={handleBack}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t('common.backToDashboard')}</span>
        </button>
        <div className="access-denied-card">
          <div style={{ color: 'var(--arka-gold)', marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
            <Lock size={44} strokeWidth={1.5} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--arka-navy)', fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {t('companySettings.accessRestrictedTitle')}
          </h3>
          <p style={{ margin: 0, color: 'var(--arka-text-secondary)', fontSize: '14px' }}>
            {t('companySettings.accessRestrictedText')}
          </p>
        </div>
      </div>
    );
  }

  const initials = (formData.name || 'OS')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'OS';

  const currentLogo = logoPreviewUrl || (!logoRemoved ? formData.logo_url : null);

  return (
    <div className="company-settings-container">
      {/* Top Header Navigation */}
      <div className="company-header-nav">
        <button className="back-btn" onClick={handleBack}>
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{t('common.backToProjects')}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/team-settings')}
          className="refresh-btn"
          title="Go to Team & Audit Logs"
        >
          <ShieldCheck size={16} strokeWidth={1.5} />
          <span>{t('nav.organization')}</span>
        </button>
      </div>

      {/* Title & Subtitle */}
      <div className="company-title-area">
        <span style={{
          display: 'inline-block',
          fontSize: '0.6875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--arka-gold)',
          backgroundColor: 'var(--arka-gold-subtle)',
          border: '1px solid var(--arka-gold-border)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '8px'
        }}>
          {t('companySettings.studioPill')}
        </span>
        <h2>{t('companySettings.title')}</h2>
        <p>{t('companySettings.subtitle')}</p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successToast && (
        <div className="alert success fade-out" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="company-settings-grid">
        {/* LEFT COLUMN: Configuration Form */}
        <form onSubmit={handleSubmit}>
          {/* Card 1: Company Profile & Contacts */}
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-card-icon">
                <Building2 size={20} strokeWidth={1.75} />
              </div>
              <div>
                <h3>{t('companySettings.companyInfoCard')}</h3>
                <p>{t('companySettings.companyInfoCardSub')}</p>
              </div>
            </div>

            {/* Company Name */}
            <div className="form-group">
              <label htmlFor="company-name">{t('companySettings.nameLabel')} *</label>
              <input
                id="company-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('companySettings.namePlaceholder')}
                required
              />
              <span className="company-help-text">{t('companySettings.nameHelper')}</span>
            </div>

            {/* Email & Phone */}
            <div className="company-form-row">
              <div className="form-group">
                <label htmlFor="company-email">{t('companySettings.emailLabel')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="company-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={t('companySettings.emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="company-phone">{t('companySettings.phoneLabel')}</label>
                <input
                  id="company-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={t('companySettings.phonePlaceholder')}
                />
              </div>
            </div>

            {/* Website URL */}
            <div className="form-group">
              <label htmlFor="company-website">{t('companySettings.websiteLabel')}</label>
              <input
                id="company-website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder={t('companySettings.websitePlaceholder')}
              />
            </div>

            {/* Business Address */}
            <div className="form-group">
              <label htmlFor="company-address">{t('companySettings.addressLabel')}</label>
              <input
                id="company-address"
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={t('companySettings.addressPlaceholder')}
              />
            </div>

            {/* Invoice Terms & Disclaimers */}
            <div className="form-group" style={{ marginTop: 'var(--space-2)' }}>
              <label htmlFor="company-terms">{t('companySettings.termsLabel')}</label>
              <textarea
                id="company-terms"
                rows={4}
                value={formData.invoice_terms}
                onChange={(e) => handleInputChange('invoice_terms', e.target.value)}
                placeholder={t('companySettings.termsPlaceholder')}
                style={{ resize: 'vertical' }}
              />
              <span className="company-help-text">{t('companySettings.termsHelper')}</span>
            </div>
          </div>

          {/* Card 2: Visual Branding & Logo */}
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-card-icon">
                <Palette size={20} strokeWidth={1.75} />
              </div>
              <div>
                <h3>{t('companySettings.brandingCard')}</h3>
                <p>{t('companySettings.brandingCardSub')}</p>
              </div>
            </div>

            {/* Primary Accent Color Picker */}
            <div className="form-group">
              <label>{t('companySettings.primaryColorLabel')}</label>
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  className="color-swatch-native"
                  value={formData.primary_color || '#C9A45C'}
                  onChange={(e) => handleInputChange('primary_color', e.target.value.toUpperCase())}
                  title="Pick a color"
                />
                <input
                  type="text"
                  value={formData.primary_color || '#C9A45C'}
                  onChange={(e) => handleInputChange('primary_color', e.target.value.toUpperCase())}
                  style={{ width: '130px', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase' }}
                  maxLength={7}
                />
              </div>
              <span className="company-help-text">{t('companySettings.primaryColorHelper')}</span>

              {/* Quick Preset Swatches */}
              <div className="color-presets-row">
                <span style={{ fontSize: '0.75rem', color: 'var(--arka-text-secondary)', marginRight: '6px' }}>
                  {t('companySettings.colorPresetsLabel')}:
                </span>
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    className={`color-preset-btn ${formData.primary_color?.toUpperCase() === preset.hex ? 'active' : ''}`}
                    style={{ backgroundColor: preset.hex }}
                    onClick={() => handleColorPresetSelect(preset.hex)}
                    title={`${preset.label} (${preset.hex})`}
                  />
                ))}
              </div>
            </div>

            {/* Logo Upload Box */}
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label>{t('companySettings.logoLabel')}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                className={`logo-upload-box ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {currentLogo ? (
                  <div>
                    <img
                      src={currentLogo}
                      alt={formData.name || 'Company Logo'}
                      className="logo-preview-img"
                    />
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--arka-navy)' }}>
                      {t('companySettings.logoChange')}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--arka-gold-subtle)',
                      border: '1px solid var(--arka-gold-border)',
                      color: 'var(--arka-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px auto'
                    }}>
                      <Upload size={20} strokeWidth={1.75} />
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--arka-navy)', marginBottom: '4px' }}>
                      {isUploadingLogo ? t('companySettings.logoUploading') : t('companySettings.logoUploadPlaceholder')}
                    </div>
                    <div className="company-help-text">
                      {t('companySettings.logoHelper')}
                    </div>
                  </div>
                )}
              </div>

              {currentLogo && (
                <div className="logo-actions-row">
                  <button
                    type="button"
                    className="company-remove-btn"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 size={14} />
                    <span>{t('companySettings.logoRemove')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-6)' }}>
            <button
              type="submit"
              className="company-save-btn"
              disabled={isSaving || isUploadingLogo}
            >
              {isSaving ? (
                <>
                  <RotateCw size={16} className="animate-spin" />
                  <span>{t('companySettings.saving')}</span>
                </>
              ) : (
                <>
                  <Save size={16} strokeWidth={1.75} />
                  <span>{t('companySettings.saveChanges')}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* RIGHT COLUMN: Live Interactive Mockup Preview */}
        <aside className="live-preview-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Eye size={18} style={{ color: formData.primary_color || 'var(--arka-gold)' }} />
            <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--arka-navy)' }}>
              {t('companySettings.livePreviewTitle')}
            </h4>
          </div>
          <p style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.75rem', color: 'var(--arka-text-secondary)' }}>
            {t('companySettings.livePreviewSub')}
          </p>

          {/* Mockup 1: Studio Topbar Preview */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--arka-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('companySettings.previewTopbar')}
            </span>
            <div className="live-preview-mockup">
              <div className="mockup-topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt="Preview Logo"
                      style={{ height: '28px', maxWidth: '100px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#0D1726',
                        color: formData.primary_color || '#C9A45C',
                        border: `1.5px solid ${formData.primary_color || '#C9A45C'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)'
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: 'var(--arka-navy)',
                    maxWidth: '140px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {formData.name || 'Company Name'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: '#0D1726',
                      color: formData.primary_color || '#C9A45C',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    ADMIN
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup 2: Invoice Header & Terms Snippet */}
          <div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--arka-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('companySettings.previewInvoice')}
            </span>
            <div className="live-preview-mockup">
              <div className="mockup-invoice-snippet">
                {/* Header */}
                <div className="mockup-invoice-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0D1726', fontFamily: 'var(--font-display)' }}>
                      {formData.name || 'Company Name'}
                    </div>
                    {formData.address && (
                      <div style={{ color: '#687386', fontSize: '10px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={9} />
                        <span>{formData.address}</span>
                      </div>
                    )}
                    {formData.phone && (
                      <div style={{ color: '#687386', fontSize: '10px', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Phone size={9} />
                        <span>{formData.phone}</span>
                      </div>
                    )}
                    {formData.email && (
                      <div style={{ color: '#687386', fontSize: '10px', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Mail size={9} />
                        <span>{formData.email}</span>
                      </div>
                    )}
                    {formData.website && (
                      <div style={{ color: '#687386', fontSize: '10px', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Globe size={9} />
                        <span>{formData.website}</span>
                      </div>
                    )}
                  </div>

                  <span
                    className="mockup-invoice-badge"
                    style={{ backgroundColor: formData.primary_color || '#C9A45C' }}
                  >
                    INVOICE
                  </span>
                </div>

                {/* Terms Snippet */}
                <div style={{
                  padding: '8px 10px',
                  backgroundColor: '#F9FAFB',
                  border: '1px dashed #E5E7EB',
                  borderRadius: '4px',
                  color: '#4B5563',
                  fontSize: '9.5px',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#111827', display: 'block', marginBottom: '2px' }}>
                    {t('companySettings.previewInvoiceTermsTitle')}
                  </strong>
                  {formData.invoice_terms || (
                    <em style={{ color: '#9CA3AF' }}>
                      {language === 'es' ? 'No se han configurado términos contractuales aún.' : 'No contract terms configured yet.'}
                    </em>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
