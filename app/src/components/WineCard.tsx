import React, { useState } from 'react';
import type { Wine, WineType } from '../types';

interface Props {
  wine: Wine;
  blind?: boolean;
  blindLabel?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  compact?: boolean;
}

const wineTypeColors: Record<WineType, { bg: string; text: string; label: string }> = {
  red:       { bg: 'rgba(255,178,184,0.15)', text: 'var(--md3-primary)',  label: 'Red' },
  white:     { bg: 'rgba(231,192,142,0.15)', text: 'var(--md3-tertiary)', label: 'White' },
  rosé:      { bg: 'rgba(255,178,184,0.12)', text: '#f4a0a8',            label: 'Rosé' },
  sparkling: { bg: 'rgba(231,192,142,0.12)', text: 'var(--md3-tertiary)', label: 'Sparkling' },
  dessert:   { bg: 'rgba(231,192,142,0.15)', text: '#d4a050',            label: 'Dessert' },
  orange:    { bg: 'rgba(220,160,80,0.15)',  text: '#d4a050',            label: 'Orange' },
};

function getRatingColor(rating: number): string {
  if (rating >= 4.0) return '#4caf50';
  if (rating >= 3.0) return 'var(--md3-tertiary)';
  return 'var(--md3-error)';
}

const TasteBar: React.FC<{ leftLabel: string; rightLabel: string; value: number }> = ({ leftLabel, rightLabel, value }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <span className="type-label-small" style={{ color: 'var(--md3-on-surface-variant)' }}>{leftLabel}</span>
      <span className="type-label-small" style={{ color: 'var(--md3-on-surface-variant)' }}>{rightLabel}</span>
    </div>
    <div style={{ height: 6, borderRadius: 3, background: 'var(--md3-surface-container-high)', overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', borderRadius: 3, background: 'var(--md3-primary)', transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

export const WineCard: React.FC<Props> = ({ wine, blind, blindLabel, onClick, children, compact }) => {
  const typeInfo = wine.type ? wineTypeColors[wine.type] : null;
  const [imgError, setImgError] = useState(false);

  const cardStyle: React.CSSProperties = {
    background: 'var(--md3-surface-container)',
    borderRadius: 16, overflow: 'hidden',
    border: '1px solid var(--md3-outline-variant)',
    transition: 'box-shadow 0.2s',
    cursor: onClick ? 'pointer' : undefined,
  };

  if (blind) {
    return (
      <div onClick={onClick} style={cardStyle}>
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 64, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--md3-surface-container-high), var(--md3-surface-container-highest))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 24, color: 'var(--md3-on-surface-variant)' }}>masks</span>
          </div>
          <div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600, color: 'var(--md3-on-surface)' }}>
              {blindLabel || 'Wine'}
            </h3>
            <p className="type-body-small" style={{ color: 'var(--md3-on-surface-variant)', marginTop: 2 }}>Identity hidden during tasting</p>
          </div>
        </div>
        {children && <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--md3-outline-variant)' }}>{children}</div>}
      </div>
    );
  }

  return (
    <div onClick={onClick} style={cardStyle}>
      <div style={{ padding: compact ? '12px 14px' : '16px 18px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {/* Bottle image */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {wine.imageUrl && !imgError ? (
              <img src={wine.imageUrl} alt={wine.name}
                style={{ width: compact ? 40 : 56, height: compact ? 80 : 112, objectFit: 'contain', borderRadius: 8 }}
                onError={() => setImgError(true)} />
            ) : (
              <div style={{
                width: compact ? 40 : 56, height: compact ? 80 : 112,
                borderRadius: 8,
                background: `linear-gradient(135deg, var(--md3-primary-container), var(--md3-surface-container-highest))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-rounded ms-filled" style={{ fontSize: compact ? 20 : 28, color: 'var(--md3-primary)' }}>wine_bar</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 15, fontWeight: 600,
                  color: 'var(--md3-on-surface)', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                }}>{wine.name}</h3>
                {wine.producer && (
                  <p className="type-body-small" style={{ color: 'var(--md3-on-surface-variant)', marginTop: 2 }}>{wine.producer}</p>
                )}
              </div>
              {wine.rating && (
                <div style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                  border: `2px solid ${getRatingColor(wine.rating)}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: getRatingColor(wine.rating), lineHeight: 1 }}>{wine.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {typeInfo && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
                  background: typeInfo.bg, color: typeInfo.text,
                }}>{typeInfo.label}</span>
              )}
              {wine.year && (
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 10,
                  background: 'rgba(231,192,142,0.12)', color: 'var(--md3-tertiary)',
                }}>{wine.year}</span>
              )}
              {wine.grape && (
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 10,
                  background: 'rgba(255,178,184,0.08)', color: 'var(--md3-primary)',
                }}>{wine.grape}</span>
              )}
              {wine.region && (
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 10,
                  background: 'var(--md3-surface-container-high)', color: 'var(--md3-on-surface-variant)',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12 }}>location_on</span>
                  {wine.region}{wine.country ? `, ${wine.country}` : ''}
                </span>
              )}
            </div>

            {wine.price && (
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--md3-primary)', marginTop: 8 }}>
                R$ {wine.price.toFixed(2)}
              </p>
            )}

            {wine.tasteProfile && !compact && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <TasteBar leftLabel="Light" rightLabel="Bold" value={wine.tasteProfile.body} />
                <TasteBar leftLabel="Dry" rightLabel="Sweet" value={wine.tasteProfile.sweetness} />
                {wine.type === 'red' && (
                  <TasteBar leftLabel="Smooth" rightLabel="Tannic" value={wine.tasteProfile.tannin} />
                )}
              </div>
            )}

            {wine.tastingNotes && !compact && (
              <p style={{
                fontSize: 11, fontStyle: 'italic', marginTop: 10, lineHeight: 1.5,
                color: 'var(--md3-on-surface-variant)',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
              }}>"{wine.tastingNotes}"</p>
            )}
          </div>
        </div>
      </div>
      {children && (
        <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--md3-outline-variant)' }}>{children}</div>
      )}
    </div>
  );
};

export { wineTypeColors, getRatingColor };
