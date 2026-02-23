import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const ProfilePage: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const completed = events.filter(e => e.status === 'completed');
  const totalWines = completed.reduce((sum, e) => sum + e.wines.length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="text-center pt-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-burgundy to-burgundy-dark flex items-center justify-center shadow-lg mb-3">
          <span className="text-3xl text-cream">🍷</span>
        </div>
        <h1 className="text-xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          Wine Enthusiast
        </h1>
        <p className="text-sm text-charcoal-light mt-0.5">Member since 2026</p>
      </div>

      {/* Stats grid — responsive */}
      {totalWines === 0 && clubs.length === 0 && events.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-cream-dark text-center shadow-sm">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-burgundy/10 to-gold/10 flex items-center justify-center">
            <span className="text-4xl">🥂</span>
          </div>
          <h3 className="font-semibold text-burgundy text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Your journey awaits!
          </h3>
          <p className="text-charcoal-light text-sm max-w-xs mx-auto mb-5">
            No wines tasted yet — start by creating a club and hosting your first tasting!
          </p>
          <Link
            to="/clubs/new"
            className="bg-burgundy text-cream px-8 py-3.5 rounded-2xl font-semibold shadow-lg min-h-[48px] inline-flex items-center justify-center hover:bg-burgundy-light transition-colors"
          >
            Create a Club
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Wines Tasted', value: totalWines, icon: '🍷', color: 'from-burgundy/10 to-burgundy/5' },
            { label: 'Tastings', value: completed.length, icon: '🏆', color: 'from-gold/15 to-gold/5' },
            { label: 'Clubs', value: clubs.length, icon: '👥', color: 'from-green-500/10 to-green-500/5' },
            { label: 'Events', value: events.length, icon: '📅', color: 'from-blue-500/10 to-blue-500/5' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 border border-cream-dark`}>
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-2xl font-bold text-burgundy mt-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                {stat.value}
              </p>
              <p className="text-xs text-charcoal-light mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick links — with proper 44px touch targets */}
      <div className="bg-white rounded-2xl shadow-sm border border-cream-dark overflow-hidden">
        {[
          { to: '/clubs', label: 'My Clubs', icon: '👥', count: clubs.length },
          { to: '/wines', label: 'Wine Collection', icon: '🍷', count: totalWines },
          { to: '/search', label: 'Discover Wines', icon: '🔍' },
        ].map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-5 py-4 hover:bg-cream/50 transition-colors min-h-[56px] ${
              i > 0 ? 'border-t border-cream-dark' : ''
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-charcoal">{item.label}</span>
            {item.count !== undefined && (
              <span className="text-xs font-medium bg-cream-dark text-charcoal-light px-2.5 py-1 rounded-full">
                {item.count}
              </span>
            )}
            <svg className="w-4 h-4 text-charcoal-light/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {/* App info */}
      <div className="text-center pt-4 pb-8">
        <div className="w-8 h-8 mx-auto rounded-lg wine-gradient-red flex items-center justify-center mb-2">
          <span className="text-white text-xs font-bold">W</span>
        </div>
        <p className="text-xs text-charcoal-light/50">Wine Circle v10.1</p>
        <p className="text-[10px] text-charcoal-light/40 mt-0.5">Taste, rank, celebrate together</p>
      </div>
    </div>
  );
};
