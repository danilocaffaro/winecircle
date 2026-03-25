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

const wineTypeColors: Record<WineType, { bg: string; text: string; gradient: string; label: string }> = {
  red: { bg: 'bg-wine-red/10', text: 'text-wine-red', gradient: 'wine-gradient-red', label: 'Red' },
  white: { bg: 'bg-wine-white/15', text: 'text-gold-dark', gradient: 'wine-gradient-white', label: 'White' },
  rosé: { bg: 'bg-wine-rose/15', text: 'text-pink-600', gradient: 'wine-gradient-rose', label: 'Rosé' },
  sparkling: { bg: 'bg-wine-sparkling/20', text: 'text-slate-600', gradient: 'wine-gradient-sparkling', label: 'Sparkling' },
  dessert: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'wine-gradient-default', label: 'Dessert' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', gradient: 'wine-gradient-default', label: 'Orange' },
};

function getRatingColor(rating: number): string {
  if (rating >= 4.0) return 'rating-excellent';
  if (rating >= 3.0) return 'rating-good';
  return 'rating-average';
}

function getRatingBorder(rating: number): string {
  if (rating >= 4.0) return 'border-green-400';
  if (rating >= 3.0) return 'border-yellow-400';
  return 'border-red-400';
}

const BottlePlaceholder: React.FC<{ type?: WineType; size?: 'sm' | 'md' }> = ({ type = 'red', size = 'md' }) => {
  const colors = wineTypeColors[type] || wineTypeColors.red;
  const h = size === 'sm' ? 'h-20' : 'h-28';
  const w = size === 'sm' ? 'w-10' : 'w-14';
  return (
    <div className={`${w} ${h} relative flex items-center justify-center`}>
      <div className={`absolute inset-0 ${colors.gradient} rounded-lg opacity-90`} style={{
        clipPath: 'polygon(38% 0%, 62% 0%, 62% 10%, 68% 14%, 68% 22%, 60% 27%, 60% 92%, 65% 100%, 35% 100%, 40% 92%, 40% 27%, 32% 22%, 32% 14%, 38% 10%)'
      }} />
      <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 w-[52%] h-[22%] bg-white/20 rounded-sm" />
    </div>
  );
};

/** Taste profile bar — h-2.5 (10px) for Vivino-standard ~6px+ thickness */
const TasteBar: React.FC<{ label: string; leftLabel: string; rightLabel: string; value: number }> = ({ leftLabel, rightLabel, value }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-[11px] text-charcoal-light/80 font-medium">{leftLabel}</span>
      <span className="text-[11px] text-charcoal-light/80 font-medium">{rightLabel}</span>
    </div>
    <div className="relative h-2.5 bg-cream-dark rounded-full overflow-hidden">
      <div className="taste-bar-fill absolute left-0 top-0 h-full bg-burgundy/60 rounded-full" style={{ width: `${value}%` }} />
    </div>
  </div>
);

export const WineCard: React.FC<Props> = ({ wine, blind, blindLabel, onClick, children, compact }) => {
  const typeInfo = wine.type ? wineTypeColors[wine.type] : null;
  const [imgError, setImgError] = useState(false);

  if (blind) {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-2xl shadow-md hover:shadow-lg border border-cream-dark overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
      >
        <div className="p-5 flex items-center gap-4">
          <div className="w-12 h-16 rounded-xl bg-gradient-to-br from-charcoal/10 to-charcoal/20 flex items-center justify-center">
            <span className="text-2xl">🎭</span>
          </div>
          <div>
            <h3 className="font-semibold text-burgundy text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
              {blindLabel || 'Wine'}
            </h3>
            <p className="text-xs text-charcoal-light mt-0.5">Identity hidden during tasting</p>
          </div>
        </div>
        {children && <div className="px-5 pb-5 pt-0 border-t border-cream-dark mt-0">{children}</div>}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-md hover:shadow-lg border border-cream-dark overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div className="p-5">
        <div className="flex gap-4">
          {/* Bottle image / placeholder */}
          <div className="shrink-0 flex flex-col items-center">
            {wine.imageUrl && !imgError ? (
              <img
                src={wine.imageUrl}
                alt={wine.name}
                className="w-14 h-28 object-contain rounded-lg"
                onError={() => setImgError(true)}
              />
            ) : (
              <BottlePlaceholder type={wine.type} size={compact ? 'sm' : 'md'} />
            )}
          </div>

          {/* Wine info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-burgundy text-base leading-tight line-clamp-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {wine.name}
                </h3>
                {wine.producer && (
                  <p className="text-xs text-charcoal-light mt-1 truncate">{wine.producer}</p>
                )}
              </div>

              {/* Rating badge */}
              {wine.rating && (
                <div className={`shrink-0 w-12 h-12 rounded-full border-2 ${getRatingBorder(wine.rating)} flex flex-col items-center justify-center ${getRatingColor(wine.rating)}`}>
                  <span className="text-sm font-bold leading-none">{wine.rating.toFixed(1)}</span>
                  {wine.ratingCount && (
                    <span className="text-[7px] leading-none mt-0.5 opacity-70">{wine.ratingCount >= 1000 ? `${(wine.ratingCount/1000).toFixed(0)}k` : wine.ratingCount}</span>
                  )}
                </div>
              )}
            </div>

            {/* Tags row */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {typeInfo && (
                <span className={`text-[11px] font-semibold ${typeInfo.bg} ${typeInfo.text} px-2.5 py-1 rounded-full`}>
                  {typeInfo.label}
                </span>
              )}
              {wine.year && (
                <span className="text-[11px] font-medium bg-gold/12 text-gold-dark px-2.5 py-1 rounded-full">
                  {wine.year}
                </span>
              )}
              {wine.grape && (
                <span className="text-[11px] font-medium bg-burgundy/8 text-burgundy px-2.5 py-1 rounded-full">
                  {wine.grape}
                </span>
              )}
              {wine.region && (
                <span className="text-[11px] font-medium bg-cream-dark text-charcoal-light px-2.5 py-1 rounded-full">
                  <span className="material-symbols-rounded" style={{ fontSize: 14 }}>location_on</span> {wine.region}{wine.country ? `, ${wine.country}` : ''}
                </span>
              )}
            </div>

            {/* Price */}
            {wine.price && (
              <p className="text-sm font-bold text-burgundy mt-2.5">
                R$ {wine.price.toFixed(2)}
              </p>
            )}

            {/* Taste profile — thicker bars (h-2.5) */}
            {wine.tasteProfile && !compact && (
              <div className="mt-4 space-y-2.5">
                <TasteBar label="Body" leftLabel="Light" rightLabel="Bold" value={wine.tasteProfile.body} />
                <TasteBar label="Sweetness" leftLabel="Dry" rightLabel="Sweet" value={wine.tasteProfile.sweetness} />
                {wine.type === 'red' && (
                  <TasteBar label="Tannin" leftLabel="Smooth" rightLabel="Tannic" value={wine.tasteProfile.tannin} />
                )}
              </div>
            )}

            {/* Tasting notes */}
            {wine.tastingNotes && !compact && (
              <p className="text-[11px] text-charcoal-light mt-3 line-clamp-2 leading-relaxed italic">
                "{wine.tastingNotes}"
              </p>
            )}
          </div>
        </div>
      </div>
      {children && <div className="px-5 pb-5 pt-3 border-t border-cream-dark">{children}</div>}
    </div>
  );
};

export { BottlePlaceholder, wineTypeColors, getRatingColor };
