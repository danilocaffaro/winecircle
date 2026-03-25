import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const MyWinesPage: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const completedEvents = events.filter(e => e.status === 'completed');
  const allWines = completedEvents.flatMap(e => e.wines);
  const uniqueWines = allWines.filter((wine, index, self) => index === self.findIndex(w => w.name === wine.name));

  if (uniqueWines.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>My Wines</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--md-primary-container)' }}>
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 48, color: 'var(--md-on-primary-container)' }}>wine_bar</span>
          </div>
          <h3 className="type-title-large mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>Start Your Collection</h3>
          <p className="type-body-medium mb-6 max-w-xs mx-auto" style={{ color: 'var(--md-on-surface-variant)' }}>
            Wines from your completed tastings will appear here. Start by creating a club and hosting a tasting event.
          </p>
          <Link to="/clubs/new" className="btn-primary" style={{ height: 48 }}>Create a Club</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>My Wines</h1>
        <span className="type-label-medium px-3 py-1.5 rounded-full" style={{ background: 'var(--md-surface-container-highest)', color: 'var(--md-on-surface-variant)' }}>
          {uniqueWines.length} wines
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[{ v: uniqueWines.length, l: 'Wines Tasted' }, { v: completedEvents.length, l: 'Tastings' }, { v: clubs.length, l: 'Clubs' }].map(s => (
          <div key={s.l} className="card-filled p-4 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
            <p className="type-title-large font-bold" style={{ color: 'var(--md-primary)', fontFamily: 'Playfair Display, serif' }}>{s.v}</p>
            <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>{s.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {uniqueWines.map(wine => (
          <div key={wine.id} className="card-outlined p-5 flex items-center gap-4" style={{ borderRadius: 'var(--shape-large)' }}>
            <div className="w-10 h-14 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--md-primary) 0%, #5A1F29 100%)',
                clipPath: 'polygon(38% 0%, 62% 0%, 62% 10%, 68% 14%, 68% 22%, 60% 27%, 60% 92%, 65% 100%, 35% 100%, 40% 92%, 40% 27%, 32% 22%, 32% 14%, 38% 10%)' }} />
            <div className="flex-1 min-w-0">
              <h3 className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>{wine.name}</h3>
              {wine.producer && <p className="type-body-small truncate mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>{wine.producer}</p>}
              <div className="flex gap-1.5 mt-1.5">
                {wine.year && <span className="type-label-small px-2 py-0.5 rounded-full" style={{ background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)' }}>{wine.year}</span>}
                {wine.grape && <span className="type-label-small px-2 py-0.5 rounded-full" style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}>{wine.grape}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
