import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import type { TastingEvent, Wine, EventType } from '../types';
import { getClub, getEvent, saveEvent } from '../services/storage';
import { searchWine } from '../services/gemini';
import { WineCard } from '../components/WineCard';

export const EventForm: React.FC = () => {
  const { clubId, id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<EventType>('open');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [wineSearch, setWineSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const existingEvent = id ? getEvent(id) : undefined;
  const effectiveClubId = clubId || existingEvent?.clubId || '';
  const club = getClub(effectiveClubId);

  useEffect(() => {
    if (existingEvent) {
      setName(existingEvent.name);
      setDate(existingEvent.date);
      setType(existingEvent.type);
      setSelectedMemberIds(existingEvent.memberIds);
      setWines(existingEvent.wines);
    } else if (club) {
      setSelectedMemberIds(club.members.map(m => m.id));
    }
  }, []);

  const handleSearchWine = async () => {
    if (!wineSearch.trim()) return;
    setSearching(true);
    try {
      const wine = await searchWine(wineSearch.trim());
      if (wine) { setWines([...wines, wine]); setWineSearch(''); toast.success(`Added: ${wine.name}`); }
      else toast.error('Could not find wine info');
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const addManualWine = () => {
    if (!wineSearch.trim()) return;
    setWines([...wines, { id: uuidv4(), name: wineSearch.trim() }]);
    setWineSearch('');
    toast.success('Wine added manually');
  };

  const removeWine = (wineId: string) => setWines(wines.filter(w => w.id !== wineId));

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Event name is required'); return; }
    if (wines.length < 2) { toast.error('Add at least 2 wines'); return; }
    if (selectedMemberIds.length < 1) { toast.error('Select at least 1 member'); return; }
    const event: TastingEvent = {
      id: id || uuidv4(), clubId: effectiveClubId, name: name.trim(), date, type, wines,
      memberIds: selectedMemberIds, rankings: existingEvent?.rankings || [],
      expenses: existingEvent?.expenses || null, status: existingEvent?.status || 'planning',
      createdAt: existingEvent?.createdAt || new Date().toISOString(),
    };
    saveEvent(event);
    toast.success(isEditing ? 'Event updated!' : 'Event created!');
    navigate(`/events/${event.id}`);
  };

  if (!club) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--md-surface-container-highest)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: 'var(--md-on-surface-variant)' }}>error_outline</span>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>Club not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
        {isEditing ? 'Edit Event' : 'New Event'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="type-label-large block mb-1.5" style={{ color: 'var(--md-on-surface)' }}>Event Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g., Friday Night Tasting" className="input-outlined w-full"
            style={{ minHeight: 48, borderRadius: 'var(--shape-large)' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="type-label-large block mb-1.5" style={{ color: 'var(--md-on-surface)' }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-outlined w-full"
              style={{ minHeight: 48, borderRadius: 'var(--shape-large)' }} />
          </div>
          <div>
            <label className="type-label-large block mb-1.5" style={{ color: 'var(--md-on-surface)' }}>Type</label>
            <div className="flex gap-2">
              {(['open', 'blind'] as EventType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 chip ${type === t ? 'chip-selected' : ''}`}
                  style={{ minHeight: 48, borderRadius: 'var(--shape-large)',
                    background: type === t ? 'var(--md-primary)' : 'var(--md-surface)',
                    color: type === t ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                    border: type === t ? 'none' : '1px solid var(--md-outline-variant)',
                  }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{t === 'blind' ? 'visibility_off' : 'visibility'}</span>
                  {t === 'blind' ? 'Blind' : 'Open'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Members */}
        <div>
          <label className="type-label-large block mb-2" style={{ color: 'var(--md-on-surface)' }}>
            Participants ({selectedMemberIds.length}/{club.members.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {club.members.map(member => (
              <button key={member.id} type="button" onClick={() => toggleMember(member.id)}
                className="chip" style={{
                  background: selectedMemberIds.includes(member.id) ? 'var(--md-primary)' : 'var(--md-surface)',
                  color: selectedMemberIds.includes(member.id) ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                  borderColor: selectedMemberIds.includes(member.id) ? 'transparent' : 'var(--md-outline-variant)',
                  minHeight: 44,
                }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center type-label-small font-bold"
                  style={{ background: selectedMemberIds.includes(member.id) ? 'rgba(255,255,255,0.2)' : 'var(--md-surface-container-highest)' }}>
                  {member.name.charAt(0)}
                </span>
                {member.name}
              </button>
            ))}
          </div>
        </div>

        {/* Wines */}
        <div>
          <label className="type-label-large block mb-2" style={{ color: 'var(--md-on-surface)' }}>
            Wines ({wines.length})
          </label>
          <div className="flex gap-2 mb-3">
            <input type="text" value={wineSearch} onChange={e => setWineSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchWine())}
              placeholder="Search wine with AI..." className="input-outlined flex-1"
              style={{ minHeight: 48, borderRadius: 'var(--shape-large)' }} />
            <button type="button" onClick={handleSearchWine} disabled={searching} className="btn-primary"
              style={{ minWidth: 48, minHeight: 48, padding: '0 12px', borderRadius: 'var(--shape-large)' }}>
              {searching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="material-symbols-rounded" style={{ fontSize: 20 }}>search</span>}
            </button>
            <button type="button" onClick={addManualWine} className="btn-outlined"
              style={{ minWidth: 48, minHeight: 48, padding: '0 12px', borderRadius: 'var(--shape-large)' }}
              title="Add manually">
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>add</span>
            </button>
          </div>
          <div className="space-y-3">
            {wines.map(wine => (
              <WineCard key={wine.id} wine={wine} compact>
                <button type="button" onClick={() => removeWine(wine.id)}
                  className="flex items-center gap-1 type-label-medium min-h-[44px]" style={{ color: 'var(--md-error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span> Remove
                </button>
              </WineCard>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
          {isEditing ? 'Save Changes' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};
