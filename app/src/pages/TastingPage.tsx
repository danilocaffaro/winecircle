import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { getEvent, getClub, updateEvent, saveEventRankings, getUsers, userToMember } from '../services/pocketbase';
import { SortableWineCard } from '../components/SortableWineCard';
import type { MemberRanking, Wine, WineTastingNote, Member } from '../types';

const STEPS = ['rank', 'notes'] as const;
type Step = typeof STEPS[number];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Outstanding'];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => onChange(s)}
          className="transition-transform active:scale-90" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
          <span className={`material-symbols-rounded ${s <= (hovered || value) ? 'ms-filled' : ''}`}
            style={{ fontSize: 28, color: s <= (hovered || value) ? 'var(--md-tertiary)' : 'var(--md-outline-variant)' }}>star</span>
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="type-label-small ml-1" style={{ color: 'var(--md-on-surface-variant)' }}>{STAR_LABELS[hovered || value]}</span>
      )}
    </div>
  );
}

export const TastingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [rankings, setRankings] = useState<MemberRanking[]>([]);
  const [wineOrder, setWineOrder] = useState<Wine[]>([]);
  const [step, setStep] = useState<Step>('rank');
  const [notes, setNotes] = useState<Record<string, WineTastingNote>>({});
  const [activeNoteWine, setActiveNoteWine] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const evt = await getEvent(id);
        setEvent(evt);
        const c = await getClub(evt.club);
        setClub(c);
        const participantIds: string[] = evt.participants || [];
        if (participantIds.length > 0) {
          const users = await getUsers(participantIds);
          setMembers(users.map(userToMember));
        }
        setRankings(evt.rankings || []);
        setWineOrder(evt.wines ? [...evt.wines] : []);
      } catch (e) {
        console.error('Failed to load tasting:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

  if (!event || !club) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>error_outline</span>
        <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>Event not found</p>
      </div>
    );
  }

  const currentMember = members[currentMemberIndex];
  const hasRanked = (memberId: string) => rankings.some(r => r.memberId === memberId);
  const allDone = rankings.length >= members.length;
  const wines: Wine[] = event.wines || [];

  const getNoteForWine = (wineId: string): WineTastingNote =>
    notes[wineId] || { aroma: '', palate: '', finish: '', rating: 0 };

  const updateNote = (wineId: string, field: keyof WineTastingNote, value: string | number) => {
    setNotes(prev => ({ ...prev, [wineId]: { ...getNoteForWine(wineId), [field]: value } }));
  };

  const submitRanking = async () => {
    if (!currentMember) return;
    const newRanking: MemberRanking = { memberId: currentMember.id, wineOrder: wineOrder.map(w => w.id), notes };
    const updatedRankings = [...rankings.filter(r => r.memberId !== currentMember.id), newRanking];
    setRankings(updatedRankings);

    try {
      await saveEventRankings(event.id, updatedRankings);
      toast.success(`${currentMember.name}'s tasting saved!`);
    } catch (e) {
      toast.error('Failed to save ranking');
    }

    if (currentMemberIndex < members.length - 1) {
      setCurrentMemberIndex(i => i + 1);
      setWineOrder([...wines]);
      setNotes({});
      setStep('rank');
      setActiveNoteWine(null);
    }
  };

  const finishTasting = async () => {
    if (rankings.length < members.length) { toast.error('Not all members have ranked yet'); return; }
    try {
      await updateEvent(event.id, { rankings, status: 'completed' });
      toast.success('Tasting completed!');
      navigate(`/events/${event.id}/results`);
    } catch (e) {
      toast.error('Failed to complete tasting');
    }
  };

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)' }}>wine_bar</span>
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>Tasting</h1>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{event.title}</p>
      </div>

      {/* Progress */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)', marginBottom: 20 }}>
        <div className="flex justify-between type-body-medium mb-2">
          <span style={{ color: 'var(--md-on-surface-variant)' }}>Progress</span>
          <span style={{ color: 'var(--md-primary)', fontWeight: 700 }}>{rankings.length}/{members.length} ranked</span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--md-surface-container-highest)' }}>
          <div className="h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${members.length > 0 ? (rankings.length / members.length) * 100 : 0}%`, background: 'var(--md-primary)' }} />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {members.map((m, i) => (
            <button key={m.id}
              onClick={() => { setCurrentMemberIndex(i); setWineOrder([...wines]); setNotes({}); setStep('rank'); }}
              className="chip" style={{
                background: hasRanked(m.id) ? 'var(--md-tertiary-container)' : i === currentMemberIndex ? 'var(--md-primary)' : 'var(--md-surface-container)',
                color: hasRanked(m.id) ? 'var(--md-on-tertiary-container)' : i === currentMemberIndex ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                borderColor: 'transparent',
              }}>
              {hasRanked(m.id) && <span className="material-symbols-rounded" style={{ fontSize: 16 }}>check</span>}
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current member flow */}
      {!allDone && currentMember && (
        <div className="space-y-4">
          {/* Step tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--md-surface-container-highest)' }}>
            {(['rank', 'notes'] as Step[]).map(s => (
              <button key={s} onClick={() => setStep(s)}
                className="flex-1 py-2.5 rounded-lg type-label-large flex items-center justify-center gap-1.5" style={{
                  background: step === s ? 'var(--md-surface)' : 'transparent',
                  color: step === s ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                  boxShadow: step === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none', cursor: 'pointer',
                }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{s === 'rank' ? 'military_tech' : 'rate_review'}</span>
                {s === 'rank' ? 'Rank' : 'Notes'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center type-label-medium font-bold"
              style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}>
              {currentMember.name.charAt(0)}
            </div>
            <div>
              <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>{currentMember.name}</p>
              <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{step === 'rank' ? 'Drag wines to rank them' : 'Add tasting notes (optional)'}</p>
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
                  <div key={wine.id} className="card-outlined overflow-hidden" style={{ borderRadius: 'var(--shape-large)' }}>
                    <button className="w-full flex items-center gap-3 p-4 text-left" style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                      onClick={() => setActiveNoteWine(isOpen ? null : wine.id)}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center type-label-small font-bold shrink-0"
                        style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}>
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>
                          {event.type === 'blind' ? `Wine ${String.fromCharCode(65 + i)}` : wine.name}
                        </p>
                        {hasNote && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {note.rating > 0 && (
                              <span className="flex items-center">
                                {[...Array(note.rating)].map((_, si) => (
                                  <span key={si} className="material-symbols-rounded ms-filled" style={{ fontSize: 12, color: 'var(--md-tertiary)' }}>star</span>
                                ))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasNote && <span className="w-2 h-2 rounded-full" style={{ background: '#2E7D32' }} />}
                        <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-on-surface-variant)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                        <div>
                          <label className="section-label block mb-2">Overall Rating</label>
                          <StarRating value={note.rating} onChange={v => updateNote(wine.id, 'rating', v)} />
                        </div>
                        {(['aroma', 'palate', 'finish'] as const).map(field => (
                          <div key={field}>
                            <label className="section-label block mb-1.5 capitalize">{field}</label>
                            <textarea value={note[field]} onChange={e => updateNote(wine.id, field, e.target.value)}
                              placeholder={field === 'aroma' ? 'Berries, oak, earth...' : field === 'palate' ? 'Tannins, acidity, body...' : 'Length, aftertaste...'}
                              rows={2} className="input-outlined w-full resize-none" style={{ minHeight: 64, borderRadius: 'var(--shape-medium)' }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit */}
          <div className="sticky bottom-0 pt-3 pb-1" style={{ background: 'var(--md-background)' }}>
            <button onClick={submitRanking} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>check</span>
              Submit {currentMember.name}'s Tasting
            </button>
          </div>
        </div>
      )}

      {/* All done */}
      {allDone && (
        <div className="card-elevated text-center py-10" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 48, color: 'var(--md-tertiary)' }}>celebration</span>
          <h3 className="type-title-large font-bold mt-3" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            All Rankings Submitted!
          </h3>
          <p className="type-body-medium mt-1 mb-5" style={{ color: 'var(--md-on-surface-variant)' }}>Ready to reveal the results?</p>
          <button onClick={finishTasting} className="btn-primary">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>emoji_events</span>
            Reveal Results
          </button>
        </div>
      )}
    </div>
  );
};
