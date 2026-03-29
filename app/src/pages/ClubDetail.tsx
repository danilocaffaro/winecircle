import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getClub, deleteClub, getEvents, joinClub,
  getCurrentUser, getUsers, userToMember,
} from '../services/pocketbase';
import type { Member } from '../types';

export const ClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = getCurrentUser();
  const isMember = club && currentUser && (club.members || []).includes(currentUser.id);
  const isOwner = club && currentUser && club.owner === currentUser.id;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const c = await getClub(id);
        setClub(c);
        // Resolve members
        const memberIds: string[] = c.members || [];
        if (memberIds.length > 0) {
          const users = await getUsers(memberIds);
          setMembers(users.map(userToMember));
        }
        // Fetch events
        const evts = await getEvents(id);
        setEvents(evts);
      } catch (e) {
        console.error('Failed to load club:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!club || !confirm('Delete this club? This cannot be undone.')) return;
    try {
      await deleteClub(club.id);
      toast.success('Club deleted');
      navigate('/clubs');
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to delete');
    }
  };

  const handleJoin = async () => {
    if (!id) return;
    try {
      const updated = await joinClub(id);
      setClub(updated);
      // Reload members
      const memberIds: string[] = updated.members || [];
      const users = await getUsers(memberIds);
      setMembers(users.map(userToMember));
      toast.success('Welcome to the club!');
    } catch (e: any) {
      toast.error(e?.data?.message || 'Failed to join');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--md-surface-container-highest)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: 'var(--md-on-surface-variant)' }}>search_off</span>
        </div>
        <p className="type-body-medium mb-3" style={{ color: 'var(--md-on-surface-variant)' }}>Club not found</p>
        <Link to="/clubs" className="btn-text">Back to clubs</Link>
      </div>
    );
  }

  const completedEvents = events.filter(e => e.status === 'completed');

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Back */}
      <Link to="/clubs" className="btn-text inline-flex items-center" style={{ paddingLeft: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        Clubs
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 mr-3">
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            {club.name}
          </h1>
          {club.description && <p className="type-body-medium mt-1" style={{ color: 'var(--md-on-surface-variant)' }}>{club.description}</p>}
          {club.type && (
            <span className="chip mt-2" style={{ background: 'var(--md-surface-container-highest)', borderColor: 'transparent' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{club.type === 'blind' ? 'visibility_off' : 'visibility'}</span>
              {club.type === 'blind' ? 'Blind Tastings' : 'Open Tastings'}
            </span>
          )}
        </div>
        {isOwner && (
          <div className="flex gap-1 shrink-0">
            <Link to={`/clubs/${club.id}/edit`} className="btn-icon">
              <span className="material-symbols-rounded">edit</span>
            </Link>
            <button onClick={handleDelete} className="btn-icon danger">
              <span className="material-symbols-rounded">delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Join button if not member */}
      {!isMember && currentUser && (
        <button onClick={handleJoin} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20 }}>person_add</span>
          Join Club
        </button>
      )}

      {/* Stats */}
      {completedEvents.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-filled p-4 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
            <p className="type-display-small font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>{completedEvents.length}</p>
            <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>Tastings</p>
          </div>
          <div className="card-filled p-4 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
            <p className="type-display-small font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>{members.length}</p>
            <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>Members</p>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>group</span>
          <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Members ({members.length})
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>person_off</span>
            <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>No members yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map(member => (
              <div key={member.id} className="group" style={{ padding: '10px 12px', borderRadius: 'var(--shape-medium)', transition: 'background var(--motion-duration-short2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-surface-container-low)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center type-label-large font-bold"
                    style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <span className="type-body-large" style={{ color: 'var(--md-on-surface)' }}>{member.name}</span>
                    {member.pixKey && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="pix-badge">PIX</span>
                        <span className="type-body-small truncate max-w-[140px]" style={{ color: 'var(--md-on-surface-variant)' }}>{member.pixKey}</span>
                      </div>
                    )}
                  </div>
                  {isOwner && club.owner === currentUser?.id && member.id === currentUser?.id && (
                    <span className="chip" style={{ background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)', borderColor: 'transparent', height: 24, padding: '0 10px', fontSize: 11 }}>Owner</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event */}
      {isMember && (
        <Link to={`/clubs/${club.id}/events/new`} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>celebration</span>
          Create New Event
        </Link>
      )}

      {/* Events */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>event</span>
          <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Events ({events.length})
          </h2>
        </div>
        {events.length === 0 ? (
          <div className="card-elevated text-center py-10" style={{ borderRadius: 'var(--shape-extra-large)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>event_busy</span>
            <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>No events yet</p>
            <p className="type-body-small" style={{ color: 'var(--md-outline)' }}>Create your first tasting event above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((event: any) => {
              const status = event.status || 'upcoming';
              const icon = status === 'completed' ? 'emoji_events' : status === 'tasting' ? 'wine_bar' : 'event_note';
              const iconColor = status === 'completed' ? 'var(--md-tertiary)' : status === 'tasting' ? 'var(--md-secondary)' : 'var(--md-on-surface-variant)';
              return (
                <Link key={event.id} to={`/events/${event.id}`}
                  className="card-outlined flex items-center gap-4 p-4"
                  style={{ borderRadius: 'var(--shape-large)', textDecoration: 'none' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}>
                    <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: iconColor }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>{event.title}</p>
                    <p className="type-body-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {new Date(event.date).toLocaleDateString('pt-BR')} · {event.type === 'blind' ? 'Blind' : 'Open'} · {(event.wines || []).length} wines
                    </p>
                  </div>
                  <span className="chip chip-selected type-label-small shrink-0" style={{ height: 24, padding: '0 10px', background: `color-mix(in srgb, ${iconColor} 15%, transparent)`, borderColor: 'transparent', color: iconColor }}>
                    {status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
