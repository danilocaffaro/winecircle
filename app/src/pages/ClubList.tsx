import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEventsByClub } from '../services/storage';

export const ClubList: React.FC = () => {
  const clubs = getClubs();

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1
          className="type-headline-medium"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}
        >
          My Clubs
        </h1>
        <Link to="/clubs/new" className="fab fab-extended" style={{ height: 40 }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>add</span>
          New Club
        </Link>
      </div>

      {clubs.length === 0 ? (
        <div
          className="card-elevated flex flex-col items-center justify-center py-16 text-center"
          style={{ borderRadius: 'var(--shape-extra-large)' }}
        >
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'var(--md-primary-container)' }}
          >
            <span
              className="material-symbols-rounded ms-filled"
              style={{ fontSize: 40, color: 'var(--md-on-primary-container)' }}
            >
              group
            </span>
          </div>
          <h3
            className="type-title-large mb-1"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}
          >
            No Clubs Yet
          </h3>
          <p className="type-body-medium mb-5 max-w-xs" style={{ color: 'var(--md-on-surface-variant)' }}>
            Create your first wine tasting club and invite friends to join
          </p>
          <Link to="/clubs/new" className="btn-primary">
            <span className="material-symbols-rounded ms-20">add</span>
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
                className="card-outlined block"
                style={{ borderRadius: 'var(--shape-large)', textDecoration: 'none' }}
              >
                <div className="p-5 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--md-primary-container)' }}
                  >
                    <span
                      className="material-symbols-rounded ms-filled"
                      style={{ fontSize: 24, color: 'var(--md-on-primary-container)' }}
                    >
                      group
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="type-title-medium"
                      style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}
                    >
                      {club.name}
                    </h3>
                    {club.description && (
                      <p
                        className="type-body-small mt-0.5"
                        style={{ color: 'var(--md-on-surface-variant)' }}
                      >
                        {club.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'var(--md-on-surface-variant)' }}>group</span>
                        <span className="type-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                          {club.members.length} member{club.members.length !== 1 ? 's' : ''}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-rounded" style={{ fontSize: 14, color: 'var(--md-on-surface-variant)' }}>event</span>
                        <span className="type-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                          {eventCount} event{eventCount !== 1 ? 's' : ''}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: 20, color: 'var(--md-outline)', flexShrink: 0 }}
                  >
                    chevron_right
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
