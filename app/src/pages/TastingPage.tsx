import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { getEvent, getClub, saveEvent } from '../services/storage';
import { SortableWineCard } from '../components/SortableWineCard';
import type { MemberRanking, Wine, WineTastingNote } from '../types';

const STEPS = ['rank', 'notes'] as const;
type Step = typeof STEPS[number];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding'];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="text-2xl transition-transform active:scale-90"
          style={{ color: s <= (hovered || value) ? 'var(--gold)' : 'var(--cream-deeper)' }}
        >
          ★
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="text-xs text-charcoal-muted self-center ml-1">{STAR_LABELS[hovered || value]}</span>
      )}
    </div>
  );
}

export const TastingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const event = id ? getEvent(id) : undefined;
  const club = event ? getClub(event.clubId) : undefined;

  const members = club?.members.filter(m => event?.memberIds.includes(m.id)) || [];
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [rankings, setRankings] = useState<MemberRanking[]>(event?.rankings || []);
  const [wineOrder, setWineOrder] = useState<Wine[]>(event?.wines ? [...event.wines] : []);
  const [step, setStep] = useState<Step>('rank');
  const [notes, setNotes] = useState<Record<string, WineTastingNote>>({});
  const [activeNoteWine, setActiveNoteWine] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setWineOrder(prev => {
        const oldIndex = prev.findIndex(w => w.id === active.id);
        const newIndex = prev.findIndex(w => w.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  if (!event || !club) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-3">😕</span>
        <p className="text-charcoal-muted">Event not found</p>
      </div>
    );
  }

  const currentMember = members[currentMemberIndex];
  const hasRanked = (memberId: string) => rankings.some(r => r.memberId === memberId);
  const allDone = rankings.length >= members.length;

  const getNoteForWine = (wineId: string): WineTastingNote =>
    notes[wineId] || { aroma: '', palate: '', finish: '', rating: 0 };

  const updateNote = (wineId: string, field: keyof WineTastingNote, value: string | number) => {
    setNotes(prev => ({
      ...prev,
      [wineId]: { ...getNoteForWine(wineId), [field]: value }
    }));
  };

  const submitRanking = () => {
    if (!currentMember) return;
    const newRanking: MemberRanking = {
      memberId: currentMember.id,
      wineOrder: wineOrder.map(w => w.id),
      notes,
    };
    const updatedRankings = [...rankings.filter(r => r.memberId !== currentMember.id), newRanking];
    setRankings(updatedRankings);
    saveEvent({ ...event, rankings: updatedRankings });
    toast.success(`${currentMember.name}'s tasting saved! 🍷`);

    // Reset for next member
    if (currentMemberIndex < members.length - 1) {
      setCurrentMemberIndex(i => i + 1);
      setWineOrder([...event.wines]);
      setNotes({});
      setStep('rank');
      setActiveNoteWine(null);
    }
  };

  const finishTasting = () => {
    if (rankings.length < members.length) { toast.error('Not all members have ranked yet'); return; }
    saveEvent({ ...event, rankings, status: 'completed' as const });
    toast.success('Tasting completed! 🎉');
    navigate(`/events/${event.id}/results`);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          🍷 Tasting
        </h1>
        <p className="text-sm text-charcoal-muted mt-0.5">{event.name}</p>
      </div>

      {/* Progress bar */}
      <div className="card p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-charcoal-muted font-medium">Progress</span>
          <span className="text-burgundy font-bold">{rankings.length}/{members.length} ranked</span>
        </div>
        <div className="w-full bg-cream-dark rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-burgundy to-burgundy-light h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(rankings.length / members.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {members.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setCurrentMemberIndex(i); setWineOrder([...event.wines]); setNotes({}); setStep('rank'); }}
              className={`text-xs font-semibold px-3 py-2 rounded-full transition-all min-h-[36px] ${
                hasRanked(m.id) ? 'bg-green-100 text-green-800 border border-green-200' :
                i === currentMemberIndex ? 'bg-burgundy text-cream shadow-sm' :
                'bg-cream text-charcoal-muted hover:bg-cream-dark border border-cream-dark'
              }`}
            >
              {hasRanked(m.id) ? '✓ ' : ''}{m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current member flow */}
      {!allDone && currentMember && (
        <div className="space-y-4">
          {/* Step tabs */}
          <div className="flex gap-1 bg-cream-dark rounded-xl p-1">
            {(['rank', 'notes'] as Step[]).map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  step === s ? 'bg-white text-burgundy shadow-sm' : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                {s === 'rank' ? '🏅 Rank' : '📝 Notes'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full wine-gradient-red flex items-center justify-center text-cream text-sm font-bold">
              {currentMember.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">{currentMember.name}</p>
              <p className="text-xs text-charcoal-muted">{step === 'rank' ? 'Drag wines to rank them' : 'Add tasting notes (optional)'}</p>
            </div>
          </div>

          {/* STEP: RANK */}
          {step === 'rank' && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={wineOrder.map(w => w.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {wineOrder.map((wine, index) => (
                    <SortableWineCard key={wine.id} wine={wine} index={index} blind={event.type === 'blind'} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* STEP: NOTES */}
          {step === 'notes' && (
            <div className="space-y-3">
              {wineOrder.map((wine, i) => {
                const note = getNoteForWine(wine.id);
                const isOpen = activeNoteWine === wine.id;
                const hasNote = note.aroma || note.palate || note.finish || note.rating > 0;
                return (
                  <div key={wine.id} className="card overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => setActiveNoteWine(isOpen ? null : wine.id)}
                    >
                      <div className="w-8 h-8 rounded-full wine-gradient-red flex items-center justify-center text-cream text-xs font-bold flex-shrink-0">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-burgundy truncate">
                          {event.type === 'blind' ? `Wine ${String.fromCharCode(65 + i)}` : wine.name}
                        </p>
                        {hasNote && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {note.rating > 0 && <span className="text-xs text-gold">{Array(note.rating).fill('★').join('')}</span>}
                            {(note.aroma || note.palate) && <span className="text-xs text-charcoal-muted truncate">{note.aroma || note.palate}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasNote && <span className="w-2 h-2 rounded-full bg-green-400" />}
                        <svg className={`w-4 h-4 text-charcoal-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-cream-dark pt-3">
                        {/* Star rating */}
                        <div>
                          <label className="section-label block mb-2">Overall Rating</label>
                          <StarRating value={note.rating} onChange={v => updateNote(wine.id, 'rating', v)} />
                        </div>
                        {/* Text notes */}
                        {(['aroma', 'palate', 'finish'] as const).map(field => (
                          <div key={field}>
                            <label className="section-label block mb-1.5 capitalize">{field}</label>
                            <textarea
                              value={note[field]}
                              onChange={e => updateNote(wine.id, field, e.target.value)}
                              placeholder={
                                field === 'aroma' ? 'Berries, oak, earth...' :
                                field === 'palate' ? 'Tannins, acidity, body...' :
                                'Length, aftertaste...'
                              }
                              rows={2}
                              className="input-field resize-none text-sm"
                              style={{ minHeight: '64px' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={submitRanking}
            className="btn-primary w-full mt-2"
          >
            ✓ Submit {currentMember.name}'s Tasting
          </button>
        </div>
      )}

      {/* All done */}
      {allDone && (
        <div className="text-center py-10 card">
          <span className="text-5xl block mb-3">🎉</span>
          <h3 className="font-bold text-burgundy text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            All Rankings Submitted!
          </h3>
          <p className="text-sm text-charcoal-muted mb-5">Ready to reveal the results?</p>
          <button onClick={finishTasting} className="btn-primary">
            🏆 Reveal Results
          </button>
        </div>
      )}
    </div>
  );
};
