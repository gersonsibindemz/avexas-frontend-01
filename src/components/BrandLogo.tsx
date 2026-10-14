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
      className={`object-contain ${className}`}
    />
  );
};

export default BrandLogo;
