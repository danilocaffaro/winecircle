import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { getClub, deleteClub, getEventsByClub, saveClub } from '../services/storage';
import { calculateBordaCount } from '../utils/algorithms';

export const ClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState(() => id ? getClub(id) : undefined);
  const events = id ? getEventsByClub(id) : [];
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPix, setNewMemberPix] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingPixId, setEditingPixId] = useState<string | null>(null);
  const [editingPixValue, setEditingPixValue] = useState('');

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

  const handleDelete = () => {
    if (confirm('Delete this club? This cannot be undone.')) {
      deleteClub(club.id);
      toast.success('Club deleted');
      navigate('/clubs');
    }
  };

  const addMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) { toast.error('Enter a member name'); return; }
    if (club.members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) { toast.error('Member already exists'); return; }
    const updatedClub = { ...club, members: [...club.members, { id: uuidv4(), name: trimmed, pixKey: newMemberPix.trim() || undefined }] };
    saveClub(updatedClub);
    setClub(updatedClub);
    setNewMemberName('');
    setNewMemberPix('');
    toast.success(`${trimmed} added!`);
  };

  const saveMemberPix = (memberId: string) => {
    const updatedClub = { ...club, members: club.members.map(m => m.id === memberId ? { ...m, pixKey: editingPixValue.trim() || undefined } : m) };
    saveClub(updatedClub);
    setClub(updatedClub);
    setEditingPixId(null);
    toast.success('Chave Pix salva!');
  };

  const removeMember = (memberId: string) => {
    const member = club.members.find(m => m.id === memberId);
    if (!member || !confirm(`Remove ${member.name} from the club?`)) return;
    const updatedClub = { ...club, members: club.members.filter(m => m.id !== memberId) };
    saveClub(updatedClub);
    setClub(updatedClub);
    toast.success(`${member.name} removed`);
  };

  const completedEvents = events.filter(e => e.status === 'completed');
  const allWines = completedEvents.flatMap(e => e.wines);
  const uniqueWines = [...new Map(allWines.map(w => [w.name, w])).values()];
  const allCountries = allWines.map(w => w.country).filter(Boolean);
  const topCountry = allCountries.length
    ? [...allCountries.reduce((m, c) => m.set(c!, (m.get(c!) || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const allResults = completedEvents.flatMap(e => calculateBordaCount(e.wines, e.rankings));
  const topWine = allResults.length
    ? [...allResults.reduce((m, r) => { const prev = m.get(r.wine.name) || { ...r, totalPoints: 0 }; return m.set(r.wine.name, { ...prev, totalPoints: prev.totalPoints + r.totalPoints }); }, new Map())].sort((a, b) => b[1].totalPoints - a[1].totalPoints)[0]?.[1]
    : null;

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
        </div>
        <div className="flex gap-1 shrink-0">
          <Link to={`/clubs/${club.id}/edit`} className="btn-icon">
            <span className="material-symbols-rounded">edit</span>
          </Link>
          <button onClick={handleDelete} className="btn-icon danger">
            <span className="material-symbols-rounded">delete</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {completedEvents.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card-filled p-4 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
            <p className="type-display-small font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>{completedEvents.length}</p>
            <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>Tastings</p>
          </div>
          <div className="card-filled p-4 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
            <p className="type-display-small font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>{uniqueWines.length}</p>
            <p className="type-label-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>Wines Tasted</p>
          </div>
          {topWine && (
            <div className="col-span-2 p-4" style={{ background: 'var(--md-tertiary-container)', borderRadius: 'var(--shape-large)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-rounded ms-filled" style={{ fontSize: 18, color: 'var(--md-on-tertiary-container)' }}>emoji_events</span>
                <p className="section-label" style={{ color: 'var(--md-on-tertiary-container)' }}>All-Time Favorite</p>
              </div>
              <p className="type-title-small" style={{ color: 'var(--md-on-tertiary-container)' }}>{topWine.wine.name}</p>
              {topWine.wine.producer && <p className="type-body-small" style={{ color: 'var(--md-on-tertiary-container)', opacity: 0.8 }}>{topWine.wine.producer}</p>}
            </div>
          )}
          {topCountry && (
            <div className="card-filled p-4" style={{ borderRadius: 'var(--shape-large)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-on-surface-variant)' }}>public</span>
                <p className="section-label">Top Country</p>
              </div>
              <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>{topCountry}</p>
            </div>
          )}
          <div className="card-filled p-4" style={{ borderRadius: 'var(--shape-large)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-on-surface-variant)' }}>group</span>
              <p className="section-label">Members</p>
            </div>
            <p className="type-display-small font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>{club.members.length}</p>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>group</span>
            <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
              Members ({club.members.length})
            </h2>
          </div>
          <button onClick={() => setShowAddMember(!showAddMember)} className="btn-tonal" style={{ height: 36, padding: '0 16px' }}>
            {showAddMember ? 'Done' : (
              <>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>person_add</span>
                Add
              </>
            )}
          </button>
        </div>

        {showAddMember && (
          <div className="flex flex-col gap-2 mb-3 p-3" style={{ background: 'var(--md-surface-container)', borderRadius: 'var(--shape-large)' }}>
            <div className="flex gap-2">
              <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); }}}
                placeholder="Member name" className="input-outlined flex-1" style={{ minHeight: 48, borderRadius: 'var(--shape-medium)' }} autoFocus />
              <button onClick={addMember} className="btn-primary" style={{ height: 48 }}>Add</button>
            </div>
            <input type="text" value={newMemberPix} onChange={e => setNewMemberPix(e.target.value)}
              placeholder="Chave Pix (opcional)" className="input-outlined" style={{ minHeight: 44, borderRadius: 'var(--shape-medium)' }} />
          </div>
        )}

        {club.members.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>person_off</span>
            <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>No members yet</p>
            {!showAddMember && (
              <button onClick={() => setShowAddMember(true)} className="btn-text mt-2">Add your first member</button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {club.members.map(member => (
              <div key={member.id} className="group" style={{ padding: '10px 12px', borderRadius: 'var(--shape-medium)', transition: 'background var(--motion-duration-short2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--md-surface-container-low)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center type-label-large font-bold"
                      style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="type-body-large" style={{ color: 'var(--md-on-surface)' }}>{member.name}</span>
                      {member.pixKey && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="pix-badge">PIX</span>
                          <span className="type-body-small truncate max-w-[140px]" style={{ color: 'var(--md-on-surface-variant)' }}>{member.pixKey}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0">
                    <button onClick={() => { setEditingPixId(editingPixId === member.id ? null : member.id); setEditingPixValue(member.pixKey || ''); }}
                      className="btn-icon" style={{ width: 40, height: 40 }}>
                      <span className="material-symbols-rounded ms-20" style={{ color: '#32BCAD' }}>account_balance_wallet</span>
                    </button>
                    <button onClick={() => removeMember(member.id)}
                      className="btn-icon danger" style={{ width: 40, height: 40, opacity: 0.5 }}>
                      <span className="material-symbols-rounded ms-20">close</span>
                    </button>
                  </div>
                </div>
                {editingPixId === member.id && (
                  <div className="flex gap-2 mt-2 ml-13">
                    <input type="text" value={editingPixValue} onChange={e => setEditingPixValue(e.target.value)}
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      className="input-outlined flex-1" style={{ minHeight: 40, fontSize: 14, borderRadius: 'var(--shape-medium)' }} autoFocus />
                    <button onClick={() => saveMemberPix(member.id)}
                      className="btn-primary" style={{ height: 40, background: '#32BCAD' }}>Salvar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event */}
      <Link to={`/clubs/${club.id}/events/new`} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
        <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>celebration</span>
        Create New Event
      </Link>

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
            {events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(event => {
              const icon = event.status === 'completed' ? 'emoji_events' : event.status === 'tasting' ? 'wine_bar' : 'event_note';
              const iconColor = event.status === 'completed' ? 'var(--md-tertiary)' : event.status === 'tasting' ? 'var(--md-secondary)' : 'var(--md-on-surface-variant)';
              return (
                <Link key={event.id} to={`/events/${event.id}`}
                  className="card-outlined flex items-center gap-4 p-4"
                  style={{ borderRadius: 'var(--shape-large)', textDecoration: 'none' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)` }}>
                    <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: iconColor }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>{event.name}</p>
                    <p className="type-body-small mt-0.5" style={{ color: 'var(--md-on-surface-variant)' }}>
                      {new Date(event.date).toLocaleDateString('pt-BR')} · {event.type === 'blind' ? 'Blind' : 'Open'} · {event.wines.length} wines
                    </p>
                  </div>
                  <span className="chip chip-selected type-label-small shrink-0" style={{ height: 24, padding: '0 10px', background: `color-mix(in srgb, ${iconColor} 15%, transparent)`, borderColor: 'transparent', color: iconColor }}>
                    {event.status}
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
