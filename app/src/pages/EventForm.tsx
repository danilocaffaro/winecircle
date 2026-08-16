import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Wine, EventType, Club, Member, TastingEvent } from '../types';
import { getClub, getEvent, createEvent, updateEvent, getMembers, describeError, getCapabilities } from '../services/pocketbase';

import { WineCard } from '../components/WineCard';
import { BuscaVinho } from '../components/BuscaVinho';

export const EventForm: React.FC = () => {
  const { clubId, id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<EventType>('open');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingEvent, setExistingEvent] = useState<TastingEvent | null>(null);
  // O catálogo local sempre existe; a IA é um extra para o que não está nele.
  const [temCatalogo, setTemCatalogo] = useState(false);

  useEffect(() => { getCapabilities().then((c) => setTemCatalogo(c.catalog > 0 || c.aiSearch)); }, []);

  useEffect(() => {
    (async () => {
      try {
        let effectiveClubId = clubId;

        if (id) {
          const evt = await getEvent(id);
          setExistingEvent(evt);
          effectiveClubId = evt.club;
          setName(evt.title || '');
          setDate(evt.date?.split(' ')[0] || evt.date || '');
          setType(evt.type || 'open');
          setWines(evt.wines || []);
          setSelectedMemberIds(evt.participants || []);
        }

        if (effectiveClubId) {
          const c = await getClub(effectiveClubId);
          setClub(c);
          const memberIds: string[] = c.members || [];
          if (memberIds.length > 0) {
            setMembers(await getMembers(memberIds));
            // If creating new event, select all members by default
            if (!id) setSelectedMemberIds(memberIds);
          }
        }
      } catch (err) {
        toast.error(describeError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId, id]);

  const removeWine = (wineId: string) => setWines(wines.filter(w => w.id !== wineId));

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => prev.includes(memberId) ? prev.filter(i => i !== memberId) : [...prev, memberId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Dê um nome ao evento'); return; }
    if (wines.length < 2) { toast.error('Adicione ao menos 2 vinhos'); return; }
    if (selectedMemberIds.length < 1) { toast.error('Selecione ao menos 1 participante'); return; }

    setSaving(true);
    try {
      if (isEditing && id) {
        await updateEvent(id, {
          title: name.trim(),
          date,
          type,
          wines,
          participants: selectedMemberIds,
        });
        toast.success('Evento atualizado!');
        navigate(`/events/${id}`);
      } else {
        const effectiveClubId = clubId || existingEvent?.club || '';
        const evt = await createEvent({
          title: name.trim(),
          club: effectiveClubId,
          date,
          type,
          wines,
          participants: selectedMemberIds,
        });
        toast.success('Evento criado!');
        navigate(`/events/${evt.id}`);
      }
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
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
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: 'var(--md-on-surface-variant)' }}>error_outline</span>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>Clube não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
        {isEditing ? 'Editar evento' : 'Novo evento'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="event-name" className="type-label-large block mb-1.5" style={{ color: 'var(--md-on-surface)' }}>Nome do evento *</label>
          <input id="event-name" data-testid="event-name" type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="ex: Degustação de sexta" className="input-outlined w-full"
            style={{ minHeight: 48, borderRadius: 'var(--shape-large)' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="event-date" className="type-label-large block mb-1.5" style={{ color: 'var(--md-on-surface)' }}>Data</label>
            <input id="event-date" data-testid="event-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="input-outlined w-full"
              style={{ minHeight: 48, borderRadius: 'var(--shape-large)' }} />
          </div>
          <div>
            <span className="type-label-large block mb-1.5" style={{ color: 'var(--md-on-surface)' }}>Tipo</span>
            <div className="flex gap-2">
              {(['open', 'blind'] as EventType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} data-testid={`event-type-${t}`}
                  className={`flex-1 flex items-center justify-center gap-1.5 chip ${type === t ? 'chip-selected' : ''}`}
                  style={{ minHeight: 48, borderRadius: 'var(--shape-large)',
                    background: type === t ? 'var(--md-primary)' : 'var(--md-surface)',
                    color: type === t ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                    border: type === t ? 'none' : '1px solid var(--md-outline-variant)',
                  }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{t === 'blind' ? 'visibility_off' : 'visibility'}</span>
                  {t === 'blind' ? 'Às cegas' : 'Aberta'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="type-label-large block mb-2" style={{ color: 'var(--md-on-surface)' }}>
            Participantes ({selectedMemberIds.length}/{members.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <button key={member.id} type="button" onClick={() => toggleMember(member.id)} data-testid={`participant-${member.id}`}
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
            Vinhos ({wines.length})
          </label>
          <BuscaVinho temBusca={temCatalogo} onAdicionar={(w) => setWines((prev) => [...prev, w])} />

          <div className="space-y-3">
            {wines.map(wine => (
              <WineCard key={wine.id} wine={wine} compact>
                <button type="button" onClick={() => removeWine(wine.id)}
                  className="flex items-center gap-1 type-label-medium min-h-[44px]" style={{ color: 'var(--md-error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>close</span> Remover
                </button>
              </WineCard>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} data-testid="save-event" className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar evento'}
        </button>
      </form>
    </div>
  );
};
