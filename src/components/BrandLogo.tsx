import React from 'react';
import { BRANDING } from '../config/branding';

interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'icon';
  collapsed?: boolean;
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  collapsed = false,
  className = 'h-8 w-auto',
  alt = 'Avexas CMMS',
}) => {
  const logoSrc = collapsed
    ? BRANDING.logos.icon
    : BRANDING.logos[variant] || BRANDING.logos.light;

  return (
    <img
      src={logoSrc}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      className={`object-contain select-none pointer-events-none ${className}`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    />
  );
};

export default BrandLogo;
