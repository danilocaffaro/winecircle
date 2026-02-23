import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEventsByClub } from '../services/storage';

export const ClubList: React.FC = () => {
  const clubs = getClubs();

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          My Clubs
        </h1>
        <Link
          to="/clubs/new"
          className="bg-burgundy text-cream px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-sm min-h-[44px] flex items-center"
        >
          + New Club
        </Link>
      </div>

      {clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl shadow-sm border border-cream-dark">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-burgundy/10 to-gold/10 flex items-center justify-center">
            <span className="text-4xl">🏛️</span>
          </div>
          <h3 className="font-semibold text-burgundy text-lg mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            No Clubs Yet
          </h3>
          <p className="text-charcoal-light text-sm mb-5 max-w-xs">
            Create your first wine tasting club and invite friends to join
          </p>
          <Link
            to="/clubs/new"
            className="bg-burgundy text-cream px-8 py-3.5 rounded-2xl font-semibold hover:bg-burgundy-light transition-colors shadow-md min-h-[48px] flex items-center"
          >
            Create Club
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clubs.map(club => {
            const eventCount = getEventsByClub(club.id).length;
            return (
              <Link
                key={club.id}
                to={`/clubs/${club.id}`}
                className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-cream-dark hover:shadow-md transition-all"
              >
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burgundy/15 to-gold/10 flex items-center justify-center shrink-0">
                    <span className="text-2xl">🏛️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-burgundy text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {club.name}
                    </h3>
                    {club.description && (
                      <p className="text-xs text-charcoal-light mt-0.5 line-clamp-1">{club.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] font-medium text-charcoal-light">
                        👥 {club.members.length} members
                      </span>
                      <span className="text-[11px] font-medium text-charcoal-light">
                        📅 {eventCount} events
                      </span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-charcoal-light/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
