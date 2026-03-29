import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyClubs, getEvents } from '../services/pocketbase';

export const ClubList: React.FC = () => {
  const [clubs, setClubs] = useState<any[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await getMyClubs();
        setClubs(c);
        // Fetch event counts in parallel
        const counts: Record<string, number> = {};
        await Promise.all(c.map(async club => {
          try {
            const evts = await getEvents(club.id);
            counts[club.id] = evts.length;
          } catch { counts[club.id] = 0; }
        }));
        setEventCounts(counts);
      } catch (e) {
        console.error('Failed to load clubs:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 28, fontWeight: 700,
          color: 'var(--dp-cream)',
        }}>My Clubs</h1>

        <Link
          to="/clubs/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', height: 40,
            borderRadius: 'var(--shape-full)',
            background: 'var(--dp-gold)',
            color: 'var(--md-on-primary)',
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'inherit',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
          New Club
        </Link>
      </div>

      {clubs.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--dp-surface-2)',
            border: '1px solid var(--dp-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 36, color: 'var(--dp-gold)', opacity: 0.8 }}>
              diversity_3
            </span>
          </div>

          <h3 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 22, fontWeight: 600,
            color: 'var(--dp-cream)',
            marginBottom: 8,
          }}>
            Start your first club
          </h3>

          <p style={{
            fontSize: 15, lineHeight: 1.6,
            color: 'var(--dp-cream-muted)',
            maxWidth: 280, marginBottom: 8,
          }}>
            A wine club is a group of friends who taste blind together. No pretension — just honest opinions.
          </p>

          <p style={{
            fontSize: 13, fontStyle: 'italic',
            color: 'var(--dp-cream-faint)',
            marginBottom: 28,
            maxWidth: 260,
          }}>
            "The best wine is the one you enjoy — the label is just marketing."
          </p>

          <Link
            to="/clubs/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 28px',
              borderRadius: 'var(--shape-full)',
              background: 'var(--dp-gold)',
              color: 'var(--md-on-primary)',
              fontSize: 15, fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>add</span>
            Create Club
          </Link>

          <div style={{
            marginTop: 40, padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid var(--dp-border)',
            background: 'var(--dp-surface-1)',
            maxWidth: 320,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--dp-gold)', flexShrink: 0, marginTop: 2 }}>
                lightbulb
              </span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dp-cream)', marginBottom: 4 }}>
                  How it works
                </p>
                <p style={{ fontSize: 12, color: 'var(--dp-cream-faint)', lineHeight: 1.5 }}>
                  Create a club → Add friends → Schedule a blind tasting → Everyone scores each wine → Reveal the winner
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {clubs.map(club => {
            const memberCount = (club.members || []).length;
            const eventCount = eventCounts[club.id] || 0;
            return (
              <Link
                key={club.id}
                to={`/clubs/${club.id}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 20px',
                  borderRadius: 16,
                  background: 'var(--dp-surface-1)',
                  border: '1px solid var(--dp-border)',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'var(--dp-gold-faint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--dp-gold)' }}>
                    group
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: 16, fontWeight: 600,
                    color: 'var(--dp-cream)',
                    marginBottom: 2,
                  }}>{club.name}</h3>
                  {club.description && (
                    <p style={{ fontSize: 13, color: 'var(--dp-cream-faint)', marginBottom: 4 }}>
                      {club.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'var(--dp-cream-faint)' }}>person</span>
                      <span style={{ fontSize: 12, color: 'var(--dp-cream-faint)' }}>{memberCount}</span>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'var(--dp-cream-faint)' }}>event</span>
                      <span style={{ fontSize: 12, color: 'var(--dp-cream-faint)' }}>{eventCount}</span>
                    </span>
                  </div>
                </div>

                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--dp-cream-faint)', flexShrink: 0 }}>
                  chevron_right
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
