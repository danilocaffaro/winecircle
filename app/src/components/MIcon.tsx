import React from 'react';

interface MIconProps {
  name: string;
  size?: number;
  filled?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Material Symbols Rounded icon wrapper.
 * Usage: <MIcon name="wine_bar" size={20} filled />
 */
export const MIcon: React.FC<MIconProps> = ({
  name,
  size = 24,
  filled = false,
  color,
  className = '',
  style,
}) => (
  <span
    className={`material-symbols-rounded ${className}`}
    style={{
      fontSize: size,
      fontVariationSettings: filled
        ? `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' ${size >= 40 ? 48 : size >= 20 ? 24 : 20}`
        : `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' ${size >= 40 ? 48 : size >= 20 ? 24 : 20}`,
      color,
      lineHeight: 1,
      ...style,
    }}
  >
    {name}
  </span>
);
