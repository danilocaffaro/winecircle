import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const MyWinesPage: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const completedEvents = events.filter(e => e.status === 'completed');
  
  // Collect all unique wines from completed tastings
  const allWines = completedEvents.flatMap(e => e.wines);
  const uniqueWines = allWines.filter((wine, index, self) => 
    index === self.findIndex(w => w.name === wine.name)
  );

  if (uniqueWines.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          My Wines
        </h1>
        
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-burgundy/10 via-gold/10 to-burgundy/5 flex items-center justify-center">
            <span className="text-5xl">🍷</span>
          </div>
          <h3 className="font-semibold text-burgundy text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Start Your Collection
          </h3>
          <p className="text-charcoal-light text-sm mb-6 max-w-xs mx-auto">
            Wines from your completed tastings will appear here. Start by creating a club and hosting a tasting event.
          </p>
          <Link
            to="/clubs/new"
            className="bg-burgundy text-cream px-8 py-3.5 rounded-2xl font-semibold hover:bg-burgundy-light transition-colors shadow-md min-h-[48px] flex items-center"
          >
            Create a Club
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          My Wines
        </h1>
        <span className="text-sm text-charcoal-light font-medium bg-cream-dark px-3 py-1.5 rounded-full">
          {uniqueWines.length} wines
        </span>
      </div>

      {/* Stats — responsive grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-cream-dark">
          <p className="text-xl font-bold text-burgundy">{uniqueWines.length}</p>
          <p className="text-[11px] text-charcoal-light mt-0.5">Wines Tasted</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-cream-dark">
          <p className="text-xl font-bold text-burgundy">{completedEvents.length}</p>
          <p className="text-[11px] text-charcoal-light mt-0.5">Tastings</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-cream-dark">
          <p className="text-xl font-bold text-burgundy">{clubs.length}</p>
          <p className="text-[11px] text-charcoal-light mt-0.5">Clubs</p>
        </div>
      </div>

      {/* Wine list — responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {uniqueWines.map(wine => (
          <div key={wine.id} className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark">
            <div className="flex items-center gap-4">
              <div className="w-10 h-14 rounded-lg wine-gradient-red flex items-center justify-center shrink-0" style={{
                clipPath: 'polygon(38% 0%, 62% 0%, 62% 10%, 68% 14%, 68% 22%, 60% 27%, 60% 92%, 65% 100%, 35% 100%, 40% 92%, 40% 27%, 32% 22%, 32% 14%, 38% 10%)'
              }}>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-burgundy text-sm truncate">{wine.name}</h3>
                {wine.producer && <p className="text-xs text-charcoal-light truncate mt-0.5">{wine.producer}</p>}
                <div className="flex gap-1.5 mt-1.5">
                  {wine.year && <span className="text-[10px] bg-gold/12 text-gold-dark px-2 py-0.5 rounded-full">{wine.year}</span>}
                  {wine.grape && <span className="text-[10px] bg-burgundy/8 text-burgundy px-2 py-0.5 rounded-full">{wine.grape}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
