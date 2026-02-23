import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { getEvent, getClub, saveEvent } from '../services/storage';
import { SortableWineCard } from '../components/SortableWineCard';
import type { MemberRanking, Wine } from '../types';

export const TastingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const event = id ? getEvent(id) : undefined;
  const club = event ? getClub(event.clubId) : undefined;

  const members = club?.members.filter(m => event?.memberIds.includes(m.id)) || [];
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [rankings, setRankings] = useState<MemberRanking[]>(event?.rankings || []);
  const [wineOrder, setWineOrder] = useState<Wine[]>(event?.wines ? [...event.wines] : []);

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
        <p className="text-charcoal-light">Event not found</p>
      </div>
    );
  }

  const currentMember = members[currentMemberIndex];
  const hasRanked = (memberId: string) => rankings.some(r => r.memberId === memberId);

  const submitRanking = () => {
    if (!currentMember) return;
    const newRanking: MemberRanking = {
      memberId: currentMember.id,
      wineOrder: wineOrder.map(w => w.id),
    };

    const updatedRankings = [...rankings.filter(r => r.memberId !== currentMember.id), newRanking];
    setRankings(updatedRankings);

    const updated = { ...event, rankings: updatedRankings };
    saveEvent(updated);

    toast.success(`${currentMember.name}'s ranking saved!`);

    if (currentMemberIndex < members.length - 1) {
      setCurrentMemberIndex(currentMemberIndex + 1);
      setWineOrder([...event.wines]);
    }
  };

  const finishTasting = () => {
    if (rankings.length < members.length) {
      toast.error('Not all members have ranked yet');
      return;
    }
    const updated = { ...event, rankings, status: 'completed' as const };
    saveEvent(updated);
    toast.success('Tasting completed! 🎉');
    navigate(`/events/${event.id}/results`);
  };

  const allDone = rankings.length >= members.length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          🍷 Tasting
        </h1>
        <p className="text-sm text-charcoal-light mt-0.5">{event.name}</p>
      </div>

      {/* Progress — thicker bar h-2.5 */}
      <div className="bg-white rounded-xl p-5 shadow-md border border-cream-dark">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-charcoal-light font-medium">Progress</span>
          <span className="text-burgundy font-bold">{rankings.length}/{members.length}</span>
        </div>
        <div className="w-full bg-cream-dark rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-burgundy to-burgundy-light h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(rankings.length / members.length) * 100}%` }}
          />
        </div>
        {/* Member pills — 44px touch targets */}
        <div className="flex flex-wrap gap-2 mt-4">
          {members.map((m, i) => (
            <button
              key={m.id}
              onClick={() => { setCurrentMemberIndex(i); setWineOrder([...event.wines]); }}
              className={`text-xs font-medium px-3 py-2.5 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                hasRanked(m.id) ? 'bg-green-100 text-green-800' :
                i === currentMemberIndex ? 'bg-burgundy text-cream shadow-sm' :
                'bg-cream text-charcoal-light hover:bg-cream-dark'
              }`}
            >
              {hasRanked(m.id) ? '✓ ' : ''}{m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Current Member Ranking */}
      {!allDone && currentMember && (
        <div>
          <h2 className="font-semibold text-burgundy mb-1 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            {currentMember.name}'s Ranking
          </h2>
          <p className="text-xs text-charcoal-light mb-4">Drag wines to reorder. #1 = favorite.</p>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={wineOrder.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {wineOrder.map((wine, index) => (
                  <SortableWineCard
                    key={wine.id}
                    wine={wine}
                    index={index}
                    blind={event.type === 'blind'}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            onClick={submitRanking}
            className="w-full mt-5 bg-gold text-white py-3.5 rounded-xl font-semibold text-base hover:bg-gold-dark active:bg-gold-dark transition-colors shadow-md min-h-[48px]"
          >
            ✓ Submit {currentMember.name}'s Ranking
          </button>
        </div>
      )}

      {/* Finish */}
      {allDone && (
        <div className="text-center py-10 bg-white rounded-xl shadow-md border border-cream-dark">
          <span className="text-5xl block mb-3">🎉</span>
          <h3 className="font-semibold text-burgundy text-lg mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            All Rankings Submitted!
          </h3>
          <p className="text-sm text-charcoal-light mb-5">Ready to see the results?</p>
          <button
            onClick={finishTasting}
            className="bg-burgundy text-cream px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-md min-h-[48px]"
          >
            🏆 See Results
          </button>
        </div>
      )}
    </div>
  );
};
