import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const ProfilePage: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const completed = events.filter(e => e.status === 'completed');
  const totalWines = completed.reduce((sum, e) => sum + e.wines.length, 0);

  const stats = [
    { label: 'Wines Tasted', value: totalWines, icon: 'wine_bar', filled: true },
    { label: 'Tastings', value: completed.length, icon: 'emoji_events', filled: true },
    { label: 'Clubs', value: clubs.length, icon: 'group', filled: false },
    { label: 'Events', value: events.length, icon: 'event', filled: false },
  ];

  const links = [
    { to: '/clubs', label: 'My Clubs', icon: 'group', count: clubs.length },
    { to: '/wines', label: 'Wine Collection', icon: 'wine_bar', count: totalWines },
    { to: '/search', label: 'Discover Wines', icon: 'search' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile header */}
      <div className="text-center pt-6">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg mb-3"
          style={{ background: 'linear-gradient(135deg, var(--md-primary) 0%, #5A1F29 100%)' }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 36, color: 'white' }}>wine_bar</span>
        </div>
        <h1 className="type-title-large" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
          Wine Enthusiast
        </h1>
        <p className="type-body-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>Member since {new Date().getFullYear()}</p>
      </div>

      {/* Stats / Empty state */}
      {totalWines === 0 && clubs.length === 0 && events.length === 0 ? (
        <div className="card-elevated p-8 text-center" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <h3 className="type-title-large mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Your journey awaits!
          </h3>
          <p className="type-body-medium max-w-xs mx-auto mb-5" style={{ color: 'var(--md-on-surface-variant)' }}>
            No wines tasted yet — start by creating a club and hosting your first tasting!
          </p>
          <Link to="/clubs/new" className="btn-primary" style={{ height: 48 }}>Create a Club</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="card-filled p-5 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
              <span className={`material-symbols-rounded ${stat.filled ? 'ms-filled' : ''}`}
                style={{ fontSize: 24, color: 'var(--md-primary)' }}>{stat.icon}</span>
              <p className="type-display-small font-bold mt-1" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>
                {stat.value}
              </p>
              <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="card-outlined overflow-hidden" style={{ borderRadius: 'var(--shape-extra-large)' }}>
        {links.map((item, i) => (
          <Link key={item.to} to={item.to}
            className="flex items-center gap-3 px-5 py-4 min-h-[56px]"
            style={{ textDecoration: 'none', borderTop: i > 0 ? '1px solid var(--md-outline-variant)' : 'none' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--md-on-surface-variant)' }}>{item.icon}</span>
            <span className="flex-1 type-body-large" style={{ color: 'var(--md-on-surface)' }}>{item.label}</span>
            {item.count !== undefined && (
              <span className="type-label-small px-2.5 py-1 rounded-full" style={{ background: 'var(--md-surface-container-highest)', color: 'var(--md-on-surface-variant)' }}>
                {item.count}
              </span>
            )}
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-outline)' }}>chevron_right</span>
          </Link>
        ))}
      </div>

      {/* App info */}
      <div className="text-center pt-4 pb-8">
        <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-2"
          style={{ background: 'var(--md-primary)' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>W</span>
        </div>
        <p className="type-label-small" style={{ color: 'var(--md-outline)' }}>Wine Circle v10.1</p>
        <p className="type-label-small" style={{ color: 'var(--md-outline)', opacity: 0.6, fontSize: 10 }}>Taste, rank, celebrate together</p>
      </div>
    </div>
  );
};
