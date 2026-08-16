import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import {
  pb, getEvent, getEventRatings, getMyRatings, submitMyRanking,
  getMembers, setEventStatus, getCurrentUser, describeError,
} from '../services/pocketbase';
import { tastersWhoSubmitted, blindLabel } from '../utils/algorithms';
import { SortableWineCard } from '../components/SortableWineCard';
import type { TastingEvent, Member, Wine, WineNote, Rating } from '../types';

const STAR_LABELS = ['', 'Fraco', 'Razoável', 'Bom', 'Ótimo', 'Excepcional'];

function StarRating({ value, onChange, label }: {
  value: number; onChange: (v: number) => void; label: string;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1 items-center" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={s === value}
          aria-label={`${s} ${s === 1 ? 'estrela' : 'estrelas'} — ${STAR_LABELS[s]}`}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s === value ? 0 : s)}
          className="transition-transform active:scale-90"
          style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer' }}
        >
          <span
            className={`material-symbols-rounded ${s <= (hovered || value) ? 'ms-filled' : ''}`}
            style={{
              fontSize: 28,
              color: s <= (hovered || value) ? 'var(--md-tertiary)' : 'var(--md-outline-variant)',
            }}
          >star</span>
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="type-label-small ml-1" style={{ color: 'var(--md-on-surface-variant)' }}>
          {STAR_LABELS[hovered || value]}
        </span>
      )}
    </div>
  );
}

/**
 * Degustação multi-dispositivo (A-15, A-10, A-09).
 *
 * A versão anterior era "passa o celular": iterava por um currentMemberIndex e
 * deixava quem estivesse com o aparelho enviar o ranking de todo mundo, sem
 * checar identidade — o que, numa degustação às cegas, entrega o resultado a
 * quem organiza. Aqui cada pessoa ranqueia no próprio dispositivo, grava só as
 * próprias notas em wc_ratings, e o progresso do grupo chega por realtime.
 */
export const TastingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const me = getCurrentUser();

  const [event, setEvent] = useState<TastingEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const [order, setOrder] = useState<number[]>([]); // índices originais, na ordem escolhida
  const [notes, setNotes] = useState<Record<number, WineNote>>({});
  const [step, setStep] = useState<'rank' | 'notes'>('rank');
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refreshRatings = useCallback(async (eventId: string) => {
    try {
      setRatings(await getEventRatings(eventId));
    } catch { /* progresso é secundário; não derruba a tela */ }
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const evt = await getEvent(id);
        if (cancelled) return;
        setEvent(evt);

        const [mem, all, mine] = await Promise.all([
          getMembers(evt.participants || []),
          getEventRatings(id),
          getMyRatings(id),
        ]);
        if (cancelled) return;

        setMembers(mem);
        setRatings(all);

        const wines: Wine[] = evt.wines || [];
        if (mine.length > 0) {
          // Já enviou antes: reidrata a ordem e as notas para poder revisar.
          setOrder([...mine].sort((a, b) => a.rank - b.rank).map((r) => r.wine_index));
          const restored: Record<number, WineNote> = {};
          for (const r of mine) {
            restored[r.wine_index] = {
              stars: r.stars ?? 0,
              aroma: r.note_aroma ?? '',
              palate: r.note_palate ?? '',
              finish: r.note_finish ?? '',
            };
          }
          setNotes(restored);
          setSubmitted(true);
        } else {
          setOrder(wines.map((_, i) => i));
        }
      } catch (err) {
        if (!cancelled) setLoadError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Progresso do grupo ao vivo: você vê os outros enviarem sem recarregar.
  useEffect(() => {
    if (!id || !me) return;
    let unsub: (() => void) | undefined;
    pb.collection('wc_ratings')
      .subscribe('*', () => { refreshRatings(id); })
      .then((fn) => { unsub = fn; })
      .catch(() => { /* realtime é um extra, não um requisito */ });
    return () => { unsub?.(); };
  }, [id, me, refreshRatings]);

  const wines: Wine[] = useMemo(() => event?.wines || [], [event]);
  const isBlind = event?.type === 'blind';
  const isParticipant = !!me && !!event && (event.participants || []).includes(me.id);
  const isOrganizer = !!me && event?.created_by === me.id;

  const submittedIds = useMemo(() => tastersWhoSubmitted(ratings), [ratings]);
  const everyoneDone = members.length > 0 && members.every((m) => submittedIds.has(m.id));

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const ids = prev.map((i) => wines[i]?.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }, [wines]);

  /** Move uma posição para outra — usado pelos botões de subir/descer. */
  const moveByIndex = useCallback((from: number, to: number) => {
    setOrder((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      return arrayMove(prev, from, to);
    });
  }, []);

  const noteFor = (wineIndex: number): WineNote =>
    notes[wineIndex] || { stars: 0, aroma: '', palate: '', finish: '' };

  const updateNote = (wineIndex: number, field: keyof WineNote, value: string | number) =>
    setNotes((prev) => ({ ...prev, [wineIndex]: { ...noteFor(wineIndex), [field]: value } }));

  const handleSubmit = async () => {
    if (!id || order.length === 0) return;
    setSaving(true);
    try {
      await submitMyRanking(id, order, notes);
      setSubmitted(true);
      await refreshRatings(id);
      toast.success(submitted ? 'Ranking atualizado!' : 'Ranking enviado!');
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await setEventStatus(id, 'completed');
      navigate(`/events/${id}/results`);
    } catch (err) {
      toast.error(describeError(err));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin"
          style={{ color: 'var(--md-primary)' }} role="status" aria-label="Carregando" />
      </div>
    );
  }

  if (loadError || !event) {
    // As regras do PocketBase escondem eventos de clubes dos quais você não
    // participa, então o 404 aqui quase sempre significa "sem acesso", não
    // "não existe". Dizer só "não encontrado" manda a pessoa procurar um erro
    // de digitação que não existe.
    const semAcesso = /não encontrado|not found/i.test(loadError);
    return (
      <div className="text-center py-16 space-y-3 max-w-md mx-auto">
        <span className="material-symbols-rounded" style={{ fontSize: 44, color: 'var(--md-outline)' }}>
          {semAcesso ? 'group_off' : 'error_outline'}
        </span>
        <h1 className="type-title-large" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
          {semAcesso ? 'Você não está nesta degustação' : 'Não deu para abrir a degustação'}
        </h1>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          {semAcesso
            ? 'Esta degustação é de um clube do qual você não faz parte. Peça o link de convite a quem organiza.'
            : loadError}
        </p>
        <Link to="/clubs" className="btn-outlined inline-flex items-center gap-1">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Voltar aos clubes
        </Link>
      </div>
    );
  }

  // Quem não foi incluído no evento não degusta — e agora sabe disso (A-18).
  if (!isParticipant) {
    return (
      <div className="text-center py-16 space-y-3 max-w-md mx-auto">
        <span className="material-symbols-rounded" style={{ fontSize: 44, color: 'var(--md-outline)' }}>
          group_off
        </span>
        <h1 className="type-title-large" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
          Você não está nesta degustação
        </h1>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          Só quem foi incluído como participante de <strong>{event.title}</strong> pode
          enviar um ranking. Peça a quem organizou para te adicionar.
        </p>
        <Link to={`/events/${event.id}`} className="btn-outlined inline-flex items-center gap-1">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Ver o evento
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', paddingBottom: 24 }}>
      <Link to={`/events/${event.id}`} className="btn-text inline-flex items-center" style={{ paddingLeft: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        Voltar ao evento
      </Link>

      <div style={{ margin: '12px 0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)' }}>
            wine_bar
          </span>
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Sua degustação
          </h1>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          {event.title}
        </p>
      </div>

      {/* Progresso do grupo */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)', marginBottom: 20 }}>
        <div className="flex justify-between type-body-medium mb-2">
          <span style={{ color: 'var(--md-on-surface-variant)' }}>Quem já enviou</span>
          <span style={{ color: 'var(--md-primary)', fontWeight: 700 }}>
            {submittedIds.size}/{members.length}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--md-surface-container-highest)' }}>
          <div className="h-2.5 rounded-full transition-all duration-500" style={{
            width: `${members.length > 0 ? (submittedIds.size / members.length) * 100 : 0}%`,
            background: 'var(--md-primary)',
          }} />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {members.map((m) => {
            const done = submittedIds.has(m.id);
            return (
              <span key={m.id} className="chip" style={{
                background: done ? 'var(--md-tertiary-container)' : 'var(--md-surface-container)',
                color: done ? 'var(--md-on-tertiary-container)' : 'var(--md-on-surface-variant)',
                borderColor: 'transparent',
              }}>
                {done && (
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>check</span>
                )}
                {m.name}{m.id === me?.id ? ' (você)' : ''}
              </span>
            );
          })}
        </div>
      </div>

      {/* Aviso honesto de que dá para revisar */}
      {submitted && !everyoneDone && (
        <div className="p-4 mb-5" style={{
          background: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)',
          borderRadius: 'var(--shape-large)', display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>check_circle</span>
          <p className="type-body-small" style={{ margin: 0 }}>
            Seu ranking foi enviado. Dá para ajustar e reenviar enquanto o grupo
            não termina — o resultado só aparece quando todos enviarem.
          </p>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--md-surface-container-highest)' }}>
        {(['rank', 'notes'] as const).map((s) => (
          <button key={s} onClick={() => setStep(s)} aria-pressed={step === s}
            className="flex-1 py-2.5 rounded-lg type-label-large flex items-center justify-center gap-1.5"
            style={{
              background: step === s ? 'var(--md-surface)' : 'transparent',
              color: step === s ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
              boxShadow: step === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              border: 'none', cursor: 'pointer',
            }}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>
              {s === 'rank' ? 'military_tech' : 'rate_review'}
            </span>
            {s === 'rank' ? 'Ranking' : 'Notas'}
          </button>
        ))}
      </div>

      <p className="type-body-small mb-3" style={{ color: 'var(--md-on-surface-variant)' }}>
        {step === 'rank'
          ? 'Arraste para ordenar do seu favorito ao menos preferido.'
          : 'As notas são opcionais e só aparecem para o grupo depois da revelação.'}
      </p>

      {step === 'rank' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order.map((i) => wines[i]?.id).filter(Boolean) as string[]}
            strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {order.map((wineIndex, position) => {
                const wine = wines[wineIndex];
                if (!wine) return null;
                return (
                  <SortableWineCard key={wine.id} wine={wine} wineIndex={wineIndex}
                    position={position} total={order.length} blind={isBlind}
                    onMove={moveByIndex} />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {step === 'notes' && (
        <div className="space-y-3">
          {order.map((wineIndex, position) => {
            const wine = wines[wineIndex];
            if (!wine) return null;
            const note = noteFor(wineIndex);
            const isOpen = openNote === wineIndex;
            const hasNote = !!(note.aroma || note.palate || note.finish || note.stars > 0);
            return (
              <div key={wine.id} className="card-outlined overflow-hidden" style={{ borderRadius: 'var(--shape-large)' }}>
                <button className="w-full flex items-center gap-3 p-4 text-left"
                  aria-expanded={isOpen}
                  style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  onClick={() => setOpenNote(isOpen ? null : wineIndex)}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center type-label-small font-bold shrink-0"
                    style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}>
                    #{position + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>
                      {isBlind ? blindLabel(wineIndex) : wine.name}
                    </p>
                    {note.stars > 0 && (
                      <span className="flex items-center mt-0.5" aria-label={`${note.stars} estrelas`}>
                        {Array.from({ length: note.stars }).map((_, si) => (
                          <span key={si} className="material-symbols-rounded ms-filled"
                            style={{ fontSize: 12, color: 'var(--md-tertiary)' }}>star</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasNote && <span className="w-2 h-2 rounded-full" style={{ background: '#2E7D32' }} />}
                    <span className="material-symbols-rounded" aria-hidden="true" style={{
                      fontSize: 20, color: 'var(--md-on-surface-variant)',
                      transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}>expand_more</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 pt-3" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                    <div>
                      <span className="section-label block mb-2">Sua nota</span>
                      <StarRating value={note.stars}
                        label={`Nota para ${isBlind ? blindLabel(wineIndex) : wine.name}`}
                        onChange={(v) => updateNote(wineIndex, 'stars', v)} />
                    </div>
                    {([
                      ['aroma', 'Aroma', 'Frutas vermelhas, carvalho, terra...'],
                      ['palate', 'Boca', 'Taninos, acidez, corpo...'],
                      ['finish', 'Final', 'Persistência, retrogosto...'],
                    ] as const).map(([field, label, placeholder]) => (
                      <div key={field}>
                        <label className="section-label block mb-1.5" htmlFor={`${field}-${wineIndex}`}>
                          {label}
                        </label>
                        <textarea id={`${field}-${wineIndex}`} value={note[field]}
                          onChange={(e) => updateNote(wineIndex, field, e.target.value)}
                          placeholder={placeholder} rows={2}
                          className="input-outlined w-full resize-none"
                          style={{ minHeight: 64, borderRadius: 'var(--shape-medium)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Enviar */}
      <div className="sticky bottom-0 pt-3 pb-1 mt-4" style={{ background: 'var(--md-background)' }}>
        <button onClick={handleSubmit} disabled={saving || order.length === 0}
          data-testid="submit-ranking"
          className="btn-primary w-full"
          style={{ height: 48, borderRadius: 'var(--shape-large)', opacity: saving ? 0.7 : 1 }}>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20 }}>check</span>
          {saving ? 'Enviando...' : submitted ? 'Atualizar meu ranking' : 'Enviar meu ranking'}
        </button>

        {everyoneDone && (
          <div className="mt-3">
            {isOrganizer ? (
              <button onClick={handleReveal} disabled={saving} data-testid="reveal-results"
                className="btn-tonal w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
                <span className="material-symbols-rounded ms-filled" aria-hidden="true" style={{ fontSize: 20 }}>
                  emoji_events
                </span>
                Todos enviaram — revelar resultado
              </button>
            ) : (
              <p className="type-body-small text-center" style={{ color: 'var(--md-on-surface-variant)' }}>
                Todos enviaram. Quem organizou vai revelar o resultado.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
