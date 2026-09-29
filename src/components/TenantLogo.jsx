import { useState } from 'react';
import { useOrganization } from '../context/OrganizationContext';

export default function TenantLogo({ 
  className = 'header-brand-logo', 
  style = {}, 
  showName = true, 
  size = 'normal' 
}) {
  const { organization } = useOrganization();
  const [imgError, setImgError] = useState(false);

  const orgName = organization?.name || 'Arka Design Group';
  const logoUrl = organization?.logo_url;
  const primaryColor = organization?.primary_color || '#C9A45C';
  const secondaryColor = organization?.secondary_color || '#0D1726';

  const initials = (orgName || 'OS')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'OS';

  const isLarge = size === 'large';
  const boxDim = isLarge ? '48px' : '34px';
  const fontSize = isLarge ? '1.15rem' : '0.85rem';

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={orgName}
        className={className}
        style={style}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="tenant-branding-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        ...style
      }}
    >
      <div
        className="header-brand-avatar"
        style={{
          width: boxDim,
          height: boxDim,
          fontSize: fontSize,
          backgroundColor: secondaryColor,
          color: primaryColor,
          borderColor: primaryColor
        }}
      >
        {initials}
      </div>
      {showName && (
        <span
          className="header-brand-name"
          style={{
            fontSize: isLarge ? '1.25rem' : '1.05rem',
            color: 'var(--arka-navy)'
          }}
        >
          {orgName}
        </span>
      )}
    </div>
  );
}
