import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const Home: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const isEmpty = clubs.length === 0 && events.length === 0;
  const completedCount = events.filter(e => e.status === 'completed').length;
  const totalWines = events.reduce((sum, e) => sum + e.wines.length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-4">

      {/* ── Greeting ── */}
      <div className="pt-2 fade-in">
        <p
          className="type-label-large"
          style={{ color: 'var(--md-on-surface-variant)' }}
        >
          {(() => {
            const h = new Date().getHours();
            if (h < 12) return 'Good morning ☀️';
            if (h < 18) return 'Good afternoon 🍷';
            return 'Good evening 🌙';
          })()}
        </p>
        <h1
          className="type-headline-large"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}
        >
          Wine Circle
        </h1>
      </div>

      {isEmpty ? (

        /* ══ Empty State ══ */
        <div className="space-y-5">

          {/* Hero card */}
          <div
            className="relative overflow-hidden fade-in"
            style={{ borderRadius: 'var(--shape-extra-large)' }}
          >
            <div className="wine-gradient-dark px-8 pt-10 pb-14 text-center">
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />
              <div className="relative">
                <div
                  className="w-20 h-20 mx-auto mb-5 flex items-center justify-center"
                  style={{
                    borderRadius: 'var(--shape-full)',
                    background: 'rgba(255,218,223,0.12)',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  <span
                    className="material-symbols-rounded ms-filled"
                    style={{ fontSize: 44, color: 'var(--md-primary-container)' }}
                  >
                    wine_bar
                  </span>
                </div>
                <h2
                  className="type-headline-small text-white mb-3"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  Your Wine Journey Starts Here
                </h2>
                <p
                  className="type-body-medium mb-6 max-w-xs mx-auto"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  Create a wine club, host blind tastings with friends, and discover amazing wines together.
                </p>
                <Link
                  to="/clubs/new"
                  className="btn-primary inline-flex"
                  style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', fontWeight: 600, paddingLeft: 32, paddingRight: 32, height: 48 }}
                >
                  <span className="material-symbols-rounded ms-20">add</span>
                  Create Your First Club
                </Link>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 fade-in fade-in-delay-1">
            {[
              { icon: 'group',         title: 'Clubs',         desc: 'Organize your community' },
              { icon: 'mask',           title: 'Blind Tasting', desc: 'Fair & unbiased' },
              { icon: 'receipt_long',  title: 'Split Bills',   desc: 'Auto-calculated' },
            ].map(feat => (
              <div
                key={feat.title}
                className="card-elevated p-4 text-center"
                style={{ borderRadius: 'var(--shape-large)' }}
              >
                <div
                  className="w-10 h-10 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--md-primary-container)' }}
                >
                  <span
                    className="material-symbols-rounded ms-filled"
                    style={{ fontSize: 20, color: 'var(--md-on-primary-container)' }}
                  >
                    {feat.icon}
                  </span>
                </div>
                <p className="type-label-medium" style={{ color: 'var(--md-on-surface)' }}>{feat.title}</p>
                <p className="type-body-small mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="fade-in fade-in-delay-2">
            <p className="section-label mb-3">How it works</p>
            <div className="space-y-2">
              {[
                { step: '1', icon: 'group_add',  text: 'Create a club and invite friends' },
                { step: '2', icon: 'wine_bar',   text: 'Add wines and start a blind tasting' },
                { step: '3', icon: 'emoji_events', text: 'Rank wines and reveal the winner!' },
              ].map(item => (
                <div
                  key={item.step}
                  className="card-elevated flex items-center gap-4 p-4"
                  style={{ borderRadius: 'var(--shape-large)' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                  >
                    <span className="type-label-large font-bold">{item.step}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <span
                      className="material-symbols-rounded"
                      style={{ fontSize: 20, color: 'var(--md-on-surface-variant)' }}
                    >
                      {item.icon}
                    </span>
                    <p className="type-body-medium" style={{ color: 'var(--md-on-surface)' }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why blind tasting */}
          <div className="fade-in fade-in-delay-3">
            <div
              className="card-elevated p-5"
              style={{ borderRadius: 'var(--shape-extra-large)', background: 'var(--md-surface-container)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)' }}>info</span>
                <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>Why blind tasting?</p>
              </div>
              <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)', lineHeight: 1.6 }}>
                When you can't see the label, you judge the wine — not the price tag. Groups that taste blind consistently discover that their favorite isn't always the most expensive one.
              </p>
              <Link
                to="/search"
                className="btn-text inline-flex items-center gap-1 mt-3 -ml-2"
                style={{ color: 'var(--md-primary)' }}
              >
                Discover wines
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
            </div>
          </div>

        </div>

      ) : (

        /* ══ Active State ══ */
        <div className="space-y-6">

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 fade-in">
            <Link
              to="/clubs/new"
              className="flex flex-col gap-2 p-5 min-h-[88px]"
              style={{
                background: 'var(--md-primary)',
                color: 'var(--md-on-primary)',
                borderRadius: 'var(--shape-extra-large)',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-rounded ms-filled" style={{ fontSize: 28 }}>add_circle</span>
              <div>
                <p className="type-title-small">New Club</p>
                <p className="type-body-small" style={{ opacity: 0.7 }}>Start a tasting group</p>
              </div>
            </Link>
            <Link
              to="/search"
              className="flex flex-col gap-2 p-5 min-h-[88px] card-elevated"
              style={{
                borderRadius: 'var(--shape-extra-large)',
                textDecoration: 'none',
                border: '1px solid var(--md-outline-variant)',
              }}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 28, color: 'var(--md-primary)' }}
              >
                search
              </span>
              <div>
                <p className="type-title-small" style={{ color: 'var(--md-primary)' }}>Search Wines</p>
                <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>AI-powered discovery</p>
              </div>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in fade-in-delay-1">
            {[
              { label: 'Clubs',     value: clubs.length,    icon: 'group' },
              { label: 'Events',    value: events.length,   icon: 'event' },
              { label: 'Completed', value: completedCount,  icon: 'check_circle' },
              { label: 'Wines',     value: totalWines,      icon: 'wine_bar' },
            ].map(stat => (
              <div
                key={stat.label}
                className="card-filled p-4 text-center"
                style={{ borderRadius: 'var(--shape-large)' }}
              >
                <span
                  className="material-symbols-rounded ms-filled"
                  style={{ fontSize: 20, color: 'var(--md-primary)' }}
                >
                  {stat.icon}
                </span>
                <p
                  className="type-display-small font-bold mt-1"
                  style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}
                >
                  {stat.value}
                </p>
                <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* My Clubs */}
          {clubs.length > 0 && (
            <div className="fade-in fade-in-delay-2">
              <div className="flex items-center justify-between mb-3">
                <p
                  className="type-title-medium"
                  style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}
                >
                  My Clubs
                </p>
                <Link to="/clubs" className="btn-text" style={{ height: 36, padding: '0 12px' }}>
                  See all
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {clubs.slice(0, 4).map(club => (
                  <Link
                    key={club.id}
                    to={`/clubs/${club.id}`}
                    className="card-outlined flex-shrink-0 w-40 p-4"
                    style={{ borderRadius: 'var(--shape-large)', textDecoration: 'none' }}
                  >
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: 'var(--md-primary-container)' }}
                    >
                      <span
                        className="material-symbols-rounded ms-filled"
                        style={{ fontSize: 20, color: 'var(--md-on-primary-container)' }}
                      >
                        group
                      </span>
                    </div>
                    <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>
                      {club.name}
                    </p>
                    <p className="type-body-small mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {club.members.length} members
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div className="fade-in fade-in-delay-3">
              <p
                className="type-title-medium mb-3"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}
              >
                Recent Events
              </p>
              <div className="space-y-2">
                {recentEvents.map(event => {
                  const statusIcon =
                    event.status === 'completed' ? 'emoji_events' :
                    event.status === 'tasting'   ? 'wine_bar' : 'event_note';
                  const statusColor =
                    event.status === 'completed' ? 'var(--md-tertiary)' :
                    event.status === 'tasting'   ? 'var(--md-secondary)' :
                    'var(--md-on-surface-variant)';
                  return (
                    <Link
                      key={event.id}
                      to={`/events/${event.id}`}
                      className="card-outlined flex items-center gap-4 p-4"
                      style={{ borderRadius: 'var(--shape-large)', textDecoration: 'none' }}
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)` }}
                      >
                        <span
                          className="material-symbols-rounded ms-filled"
                          style={{ fontSize: 20, color: statusColor }}
                        >
                          {statusIcon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>
                          {event.name}
                        </p>
                        <p className="type-body-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
                          {new Date(event.date).toLocaleDateString('pt-BR')} · {event.wines.length} wines
                        </p>
                      </div>
                      <span
                        className="chip chip-selected type-label-small shrink-0"
                        style={{
                          height: 24,
                          padding: '0 10px',
                          background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                          borderColor: 'transparent',
                          color: statusColor,
                        }}
                      >
                        {event.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
