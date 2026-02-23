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
      if (wine) {
        setWines([...wines, wine]);
        setWineSearch('');
        toast.success(`Added: ${wine.name}`);
      } else {
        toast.error('Could not find wine info');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addManualWine = () => {
    if (!wineSearch.trim()) return;
    const wine: Wine = { id: uuidv4(), name: wineSearch.trim() };
    setWines([...wines, wine]);
    setWineSearch('');
    toast.success('Wine added manually');
  };

  const removeWine = (wineId: string) => {
    setWines(wines.filter(w => w.id !== wineId));
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Event name is required'); return; }
    if (wines.length < 2) { toast.error('Add at least 2 wines'); return; }
    if (selectedMemberIds.length < 1) { toast.error('Select at least 1 member'); return; }

    const event: TastingEvent = {
      id: id || uuidv4(),
      clubId: effectiveClubId,
      name: name.trim(),
      date,
      type,
      wines,
      memberIds: selectedMemberIds,
      rankings: existingEvent?.rankings || [],
      expenses: existingEvent?.expenses || null,
      status: existingEvent?.status || 'planning',
      createdAt: existingEvent?.createdAt || new Date().toISOString(),
    };

    saveEvent(event);
    toast.success(isEditing ? 'Event updated!' : 'Event created!');
    navigate(`/events/${event.id}`);
  };

  if (!club) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cream-dark flex items-center justify-center mb-4">
          <span className="text-3xl">😕</span>
        </div>
        <p className="text-charcoal-light">Club not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
        {isEditing ? 'Edit Event' : 'New Event'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1.5">Event Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Friday Night Tasting"
            className="w-full px-4 py-3 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
            style={{ fontSize: '16px', minHeight: '48px' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-cream-dark bg-white text-charcoal focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
              style={{ fontSize: '16px', minHeight: '48px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['open', 'blind'] as EventType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all min-h-[48px] ${
                    type === t
                      ? 'bg-burgundy text-cream shadow-sm'
                      : 'bg-white border border-cream-dark text-charcoal-light hover:border-burgundy/30'
                  }`}
                >
                  {t === 'blind' ? '🙈 Blind' : '👀 Open'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Members — 44px touch targets */}
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            Participants ({selectedMemberIds.length}/{club.members.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {club.members.map(member => (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] ${
                  selectedMemberIds.includes(member.id)
                    ? 'bg-burgundy text-cream shadow-sm'
                    : 'bg-white border border-cream-dark text-charcoal-light hover:border-burgundy/30'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  selectedMemberIds.includes(member.id) ? 'bg-white/20' : 'bg-cream-dark'
                }`}>
                  {member.name.charAt(0)}
                </span>
                {member.name}
              </button>
            ))}
          </div>
        </div>

        {/* Wines */}
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-2">
            Wines ({wines.length})
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={wineSearch}
              onChange={e => setWineSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchWine())}
              placeholder="Search wine with AI..."
              className="flex-1 px-4 py-3 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-shadow"
              style={{ fontSize: '16px', minHeight: '48px' }}
            />
            <button
              type="button"
              onClick={handleSearchWine}
              disabled={searching}
              className="bg-burgundy text-cream px-4 py-3 rounded-2xl font-semibold hover:bg-burgundy-light transition-colors disabled:opacity-50 shadow-sm min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              {searching ? (
                <div className="w-5 h-5 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
              ) : '🔍'}
            </button>
            <button
              type="button"
              onClick={addManualWine}
              className="bg-white border border-cream-dark text-charcoal-light px-4 py-3 rounded-2xl font-bold hover:bg-cream transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              title="Add manually"
            >
              +
            </button>
          </div>
          <div className="space-y-3">
            {wines.map(wine => (
              <WineCard key={wine.id} wine={wine} compact>
                <button
                  type="button"
                  onClick={() => removeWine(wine.id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 min-h-[44px]"
                >
                  <span>✕</span> Remove
                </button>
              </WineCard>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-burgundy text-cream py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-md min-h-[48px]"
        >
          {isEditing ? 'Save Changes' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};
