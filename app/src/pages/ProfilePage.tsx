import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const ProfilePage: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const completed = events.filter(e => e.status === 'completed');
  const totalWines = completed.reduce((sum, e) => sum + e.wines.length, 0);

  const stats = [
    { label: 'Wines Tasted', value: totalWines, icon: 'wine_bar' },
    { label: 'Tastings', value: completed.length, icon: 'emoji_events' },
    { label: 'Clubs', value: clubs.length, icon: 'group' },
    { label: 'Events', value: events.length, icon: 'event' },
  ];

  const links = [
    { to: '/clubs', label: 'My Clubs', icon: 'group', count: clubs.length },
    { to: '/wines', label: 'Wine Collection', icon: 'wine_bar', count: totalWines },
    { to: '/search', label: 'Discover Wines', icon: 'search' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      {/* Profile header */}
      <div style={{ textAlign: 'center', paddingTop: 24, marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--dp-burgundy) 0%, var(--dp-burgundy-dim) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          border: '2px solid var(--dp-border)',
        }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 36, color: '#FFFFFF' }}>
            wine_bar
          </span>
        </div>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 24, fontWeight: 700,
          color: 'var(--dp-cream)',
          marginBottom: 4,
        }}>Wine Enthusiast</h1>
        <p style={{ fontSize: 13, color: 'var(--dp-cream-faint)' }}>
          Member since {new Date().getFullYear()}
        </p>
      </div>

      {/* Stats */}
      {totalWines === 0 && clubs.length === 0 && events.length === 0 ? (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          background: 'var(--dp-surface-1)',
          borderRadius: 20,
          border: '1px solid var(--dp-border)',
        }}>
          <h3 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 20, fontWeight: 600,
            color: 'var(--dp-cream)',
            marginBottom: 8,
          }}>Your journey awaits</h3>
          <p style={{
            fontSize: 14, lineHeight: 1.6,
            color: 'var(--dp-cream-muted)',
            maxWidth: 280, margin: '0 auto 24px',
          }}>
            No wines tasted yet — start by creating a club and hosting your first tasting!
          </p>
          <Link
            to="/clubs/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px',
              borderRadius: 'var(--shape-full)',
              background: 'var(--dp-gold)',
              color: '#0D0A0B',
              fontSize: 15, fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >Create a Club</Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 32,
        }}>
          {stats.map(stat => (
            <div key={stat.label} style={{
              padding: '20px 16px',
              textAlign: 'center',
              background: 'var(--dp-surface-1)',
              borderRadius: 16,
              border: '1px solid var(--dp-border)',
            }}>
              <span className="material-symbols-rounded ms-filled" style={{
                fontSize: 24,
                color: 'var(--dp-gold)',
                display: 'block',
                marginBottom: 8,
              }}>{stat.icon}</span>
              <p style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 28,
                fontWeight: 700,
                color: 'var(--dp-cream)',
                lineHeight: 1,
                marginBottom: 4,
              }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: 'var(--dp-cream-faint)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div style={{
        background: 'var(--dp-surface-1)',
        borderRadius: 20,
        border: '1px solid var(--dp-border)',
        overflow: 'hidden',
      }}>
        {links.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              minHeight: 56,
              textDecoration: 'none',
              borderTop: i > 0 ? '1px solid var(--dp-border)' : 'none',
              fontFamily: 'inherit',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--dp-cream-muted)', flexShrink: 0 }}>
              {item.icon}
            </span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--dp-cream)' }}>
              {item.label}
            </span>
            {item.count !== undefined && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 12,
                background: 'var(--dp-surface-2)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--dp-cream-faint)',
              }}>{item.count}</span>
            )}
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--dp-cream-faint)', flexShrink: 0 }}>
              chevron_right
            </span>
          </Link>
        ))}
      </div>

      {/* App info */}
      <div style={{ textAlign: 'center', paddingTop: 32 }}>
        <div style={{
          width: 32, height: 32,
          margin: '0 auto 8px',
          borderRadius: 10,
          background: 'var(--dp-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: '#0D0A0B', fontSize: 14, fontWeight: 800 }}>W</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--dp-cream-faint)', marginBottom: 2 }}>
          Wine Circle v1.0
        </p>
        <p style={{ fontSize: 10, color: 'var(--dp-cream-faint)', opacity: 0.6 }}>
          Taste, rank, celebrate together
        </p>
      </div>
    </div>
  );
};
