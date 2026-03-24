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
        <div className="w-16 h-16 rounded-full bg-cream-dark flex items-center justify-center mb-4">
          <span className="text-3xl">😕</span>
        </div>
        <p className="text-charcoal-light mb-3">Club not found</p>
        <Link to="/clubs" className="text-burgundy font-semibold text-sm underline underline-offset-2">Back to clubs</Link>
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
    if (!trimmed) {
      toast.error('Enter a member name');
      return;
    }
    if (club.members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Member already exists');
      return;
    }
    const updatedClub = {
      ...club,
      members: [...club.members, { id: uuidv4(), name: trimmed, pixKey: newMemberPix.trim() || undefined }],
    };
    saveClub(updatedClub);
    setClub(updatedClub);
    setNewMemberName('');
    setNewMemberPix('');
    toast.success(`${trimmed} added!`);
  };

  const saveMemberPix = (memberId: string) => {
    const updatedClub = {
      ...club,
      members: club.members.map(m =>
        m.id === memberId ? { ...m, pixKey: editingPixValue.trim() || undefined } : m
      ),
    };
    saveClub(updatedClub);
    setClub(updatedClub);
    setEditingPixId(null);
    toast.success('Chave Pix salva!');
  };

  const removeMember = (memberId: string) => {
    const member = club.members.find(m => m.id === memberId);
    if (!member) return;
    if (!confirm(`Remove ${member.name} from the club?`)) return;
    const updatedClub = {
      ...club,
      members: club.members.filter(m => m.id !== memberId),
    };
    saveClub(updatedClub);
    setClub(updatedClub);
    toast.success(`${member.name} removed`);
  };

  const completedEvents = events.filter(e => e.status === 'completed');
  const allWines = completedEvents.flatMap(e => e.wines);
  const uniqueWines = [...new Map(allWines.map(w => [w.name, w])).values()];
  const allCountries = allWines.map(w => w.country).filter(Boolean);
  const topCountry = allCountries.length
    ? [...allCountries.reduce((m, c) => m.set(c!, (m.get(c!) || 0) + 1), new Map<string, number>())]
        .sort((a, b) => b[1] - a[1])[0]?.[0]
    : null;
  const allResults = completedEvents.flatMap(e => calculateBordaCount(e.wines, e.rankings));
  const topWine = allResults.length
    ? [...allResults.reduce((m, r) => {
        const prev = m.get(r.wine.name) || { ...r, totalPoints: 0 };
        return m.set(r.wine.name, { ...prev, totalPoints: prev.totalPoints + r.totalPoints });
      }, new Map())].sort((a, b) => b[1].totalPoints - a[1].totalPoints)[0]?.[1]
    : null;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Back link — 44px touch target */}
      <Link to="/clubs" className="text-sm text-gold-dark hover:text-gold font-medium inline-flex items-center gap-1 transition-colors min-h-[44px]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Clubs
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 mr-3">
          <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
            {club.name}
          </h1>
          {club.description && <p className="text-charcoal-light text-sm mt-1">{club.description}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            to={`/clubs/${club.id}/edit`}
            className="text-sm bg-white border border-cream-dark px-3 py-2 rounded-xl hover:bg-cream transition-colors font-medium flex items-center justify-center min-w-[44px] min-h-[44px]"
          >
            ✏️
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 bg-white border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors font-medium flex items-center justify-center min-w-[44px] min-h-[44px]"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      {completedEvents.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-black text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>{completedEvents.length}</p>
            <p className="text-[11px] text-charcoal-muted mt-0.5 font-medium">Tastings</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-black text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>{uniqueWines.length}</p>
            <p className="text-[11px] text-charcoal-muted mt-0.5 font-medium">Wines Tasted</p>
          </div>
          {topWine && (
            <div className="card p-4 col-span-2">
              <p className="section-label mb-1">🏆 All-Time Favorite</p>
              <p className="font-semibold text-burgundy text-sm truncate">{topWine.wine.name}</p>
              {topWine.wine.producer && <p className="text-xs text-charcoal-muted truncate">{topWine.wine.producer}</p>}
            </div>
          )}
          {topCountry && (
            <div className="card p-4">
              <p className="section-label mb-1">🌍 Top Country</p>
              <p className="font-semibold text-sm text-charcoal">{topCountry}</p>
            </div>
          )}
          <div className="card p-4">
            <p className="section-label mb-1">👥 Members</p>
            <p className="text-2xl font-black text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>{club.members.length}</p>
          </div>
        </div>
      )}

      {/* Members section with inline add */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-burgundy text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            👥 Members ({club.members.length})
          </h2>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="text-xs font-semibold text-burgundy bg-burgundy/8 px-3 py-2 rounded-full hover:bg-burgundy/15 transition-colors min-h-[44px] flex items-center"
          >
            {showAddMember ? 'Done' : '+ Add'}
          </button>
        </div>

        {/* Inline add member — 48px inputs */}
        {showAddMember && (
          <div className="flex flex-col gap-2 mb-3 p-3 bg-cream rounded-xl border border-cream-dark">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMember();
                  }
                }}
                placeholder="Member name"
                className="flex-1 px-4 py-3 rounded-xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
                style={{ fontSize: '16px', minHeight: '48px' }}
                autoFocus
              />
              <button
                type="button"
                onClick={addMember}
                className="bg-burgundy text-cream px-5 py-3 rounded-xl font-semibold text-sm hover:bg-burgundy-light transition-colors shadow-sm min-h-[48px]"
              >
                Add
              </button>
            </div>
            <input
              type="text"
              value={newMemberPix}
              onChange={e => setNewMemberPix(e.target.value)}
              placeholder="Chave Pix (opcional) — CPF, e-mail, telefone ou chave aleatória"
              className="w-full px-4 py-2.5 rounded-xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
              style={{ fontSize: '14px', minHeight: '44px' }}
            />
          </div>
        )}

        {club.members.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-3xl block mb-2">👤</span>
            <p className="text-sm text-charcoal-light mb-3">No members yet</p>
            {!showAddMember && (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-sm font-semibold text-burgundy underline underline-offset-2 min-h-[44px]"
              >
                Add your first member
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {club.members.map(member => (
              <div key={member.id} className="bg-cream rounded-xl px-4 py-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-burgundy/10 flex items-center justify-center text-sm font-semibold text-burgundy">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-charcoal">{member.name}</span>
                      {member.pixKey && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="bg-[#32BCAD] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PIX</span>
                          <span className="text-[11px] text-charcoal-light truncate max-w-[140px]">{member.pixKey}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingPixId(editingPixId === member.id ? null : member.id);
                        setEditingPixValue(member.pixKey || '');
                      }}
                      className="text-[#32BCAD] text-xs font-bold w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#32BCAD]/10 transition-colors"
                      title="Editar chave Pix"
                    >
                      💳
                    </button>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-bold w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {editingPixId === member.id && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={editingPixValue}
                      onChange={e => setEditingPixValue(e.target.value)}
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      className="flex-1 px-3 py-2 rounded-lg border border-cream-dark bg-white text-charcoal text-sm focus:ring-2 focus:ring-[#32BCAD]/30 focus:border-[#32BCAD] transition-shadow"
                      style={{ fontSize: '14px', minHeight: '40px' }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveMemberPix(member.id)}
                      className="bg-[#32BCAD] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity min-h-[40px]"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event — 48px height */}
      <Link
        to={`/clubs/${club.id}/events/new`}
        className="bg-burgundy text-cream text-center py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-lg min-h-[48px] flex items-center justify-center"
      >
        🎉 Create New Event
      </Link>

      {/* Events */}
      <div>
        <h2 className="font-semibold text-burgundy mb-3 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
          📅 Events ({events.length})
        </h2>
        {events.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-cream-dark">
            <div className="w-14 h-14 mx-auto rounded-full bg-cream flex items-center justify-center mb-3">
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-charcoal-light text-sm mb-1">No events yet</p>
            <p className="text-charcoal-light/60 text-xs">Create your first tasting event above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm border border-cream-dark hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      event.status === 'completed' ? 'bg-green-50' :
                      event.status === 'tasting' ? 'bg-gold/10' : 'bg-cream'
                    }`}>
                      <span className="text-lg">
                        {event.status === 'completed' ? '🏆' : event.status === 'tasting' ? '🍷' : '📋'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-burgundy text-sm truncate">{event.name}</h3>
                      <p className="text-[11px] text-charcoal-light mt-0.5">
                        {new Date(event.date).toLocaleDateString()} · {event.type === 'blind' ? '🙈 Blind' : '👀 Open'} · {event.wines.length} wines
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full shrink-0 ${
                      event.status === 'completed' ? 'bg-green-50 text-green-700' :
                      event.status === 'tasting' ? 'bg-gold/15 text-gold-dark' :
                      'bg-cream-dark text-charcoal-light'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
