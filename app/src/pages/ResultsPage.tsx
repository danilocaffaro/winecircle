import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getEvent, getEventRatings, getMembers, describeError,
} from '../services/pocketbase';
import { calculateBorda, tastersWhoSubmitted, maxPoints, blindLabel } from '../utils/algorithms';
import type { TastingEvent, Member, Rating } from '../types';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<TastingEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [showPodium, setShowPodium] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const evt = await getEvent(id);
        if (cancelled) return;
        setEvent(evt);
        const [mem, rats] = await Promise.all([
          getMembers(evt.participants || []),
          getEventRatings(id),
        ]);
        if (cancelled) return;
        setMembers(mem);
        setRatings(rats);
      } catch (err) {
        if (!cancelled) setLoadError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const wines = useMemo(() => event?.wines || [], [event]);
  const results = useMemo(() => calculateBorda(wines, ratings), [wines, ratings]);
  const tasters = useMemo(() => tastersWhoSubmitted(ratings), [ratings]);
  const max = maxPoints(wines.length, tasters.size);
  const isBlind = event?.type === 'blind';

  const nameOf = (wineIndex: number) =>
    wines[wineIndex]?.name || blindLabel(wineIndex);

  const doReveal = () => {
    setRevealed(true);
    setTimeout(() => setShowPodium(true), 700);
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
    return (
      <div className="text-center py-16 space-y-4">
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>
          error_outline
        </span>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          {loadError || 'Evento não encontrado'}
        </p>
        <Link to="/clubs" className="btn-outlined inline-flex items-center gap-1">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Voltar aos clubes
        </Link>
      </div>
    );
  }

  const header = (
    <>
      <Link to={`/events/${event.id}`} className="btn-text inline-flex items-center" style={{ paddingLeft: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        Voltar ao evento
      </Link>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-tertiary)' }}>
            emoji_events
          </span>
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Resultado
          </h1>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{event.title}</p>
      </div>
    </>
  );

  /**
   * Estado vazio honesto (A-20).
   *
   * A versão anterior avisava "complete a degustação primeiro" e mantinha o
   * botão de revelar ativo, anunciando com pódio e animação um vencedor com
   * zero pontos — o primeiro vinho da lista.
   */
  if (tasters.size === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-8">
        {header}
        <div className="card-elevated p-8 text-center" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--md-outline)' }}>
            how_to_vote
          </span>
          <h2 className="type-title-large mt-3 mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Ainda não há votos
          </h2>
          <p className="type-body-medium mb-6" style={{ color: 'var(--md-on-surface-variant)' }}>
            Ninguém enviou um ranking neste evento, então não há resultado para revelar.
          </p>
          <Link to={`/events/${event.id}/tasting`} className="btn-primary">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>wine_bar</span>
            Ir para a degustação
          </Link>
        </div>
      </div>
    );
  }

  const winner = results[0];
  const partial = tasters.size < members.length;

  const getMedal = (rank: number) => {
    if (rank === 1) return { color: 'var(--md-tertiary)', bg: 'var(--md-tertiary-container)', fg: 'var(--md-on-tertiary-container)' };
    if (rank === 2) return { color: '#9CA3AF', bg: '#F3F4F6', fg: '#4B5563' };
    if (rank === 3) return { color: '#CD7F32', bg: '#FEF3E2', fg: '#7C4A15' };
    return { color: 'var(--md-outline)', bg: 'var(--md-surface-container)', fg: 'var(--md-on-surface-variant)' };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {header}

      {partial && (
        <div className="p-4" style={{
          background: 'var(--md-surface-container-high)', borderRadius: 'var(--shape-large)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-on-surface-variant)' }}>
            info
          </span>
          <p className="type-body-small" style={{ margin: 0, color: 'var(--md-on-surface-variant)' }}>
            Resultado parcial: {tasters.size} de {members.length} pessoas enviaram o ranking.
          </p>
        </div>
      )}

      {!revealed && (
        <div className="card-elevated p-8 text-center cursor-pointer fade-in" onClick={doReveal}
          role="button" tabIndex={0} data-testid="reveal-winner"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doReveal(); } }}
          style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <div className="w-24 h-24 mx-auto mb-5 rounded-full wine-gradient-dark flex items-center justify-center"
            style={{ boxShadow: '0 4px 12px rgba(60,12,17,0.3)' }}>
            <span className="material-symbols-rounded ms-filled" style={{
              fontSize: 48, color: 'var(--md-primary-container)',
            }}>visibility_off</span>
          </div>
          <h2 className="type-title-large mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Pronto para a revelação?
          </h2>
          <p className="type-body-medium mb-6" style={{ color: 'var(--md-on-surface-variant)' }}>
            {tasters.size} {tasters.size === 1 ? 'pessoa avaliou' : 'pessoas avaliaram'}
            {isBlind ? ' às cegas' : ''}. Vamos ver quem venceu.
          </p>
          <span className="btn-primary px-10">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>celebration</span>
            Revelar vencedor
          </span>
        </div>
      )}

      {revealed && winner && (
        <div className="relative overflow-hidden text-white transition-all duration-700" data-testid="winner-card"
          style={{
            background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-secondary) 40%, var(--md-primary-container) 70%, var(--md-primary) 100%)',
            borderRadius: 'var(--shape-extra-large)',
          }}>
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          <div className="relative px-8 py-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: '#D4AB5C' }}>
                emoji_events
              </span>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: '#D4AB5C',
              }}>Vencedor</p>
            </div>
            <h2 className="type-headline-medium font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              {nameOf(winner.wineIndex)}
            </h2>
            {winner.wine.producer && (
              <p className="type-body-medium" style={{ opacity: 0.7 }}>{winner.wine.producer}</p>
            )}
            <div className="flex items-center justify-center gap-3 my-4">
              <span className="type-display-small font-black" style={{
                fontFamily: 'Playfair Display, serif', color: '#D4AB5C',
              }}>{winner.totalPoints}</span>
              <span className="type-body-small" style={{ opacity: 0.5 }}>/ {max} pts</span>
            </div>
            {winner.firstPlaces > 0 && (
              <p className="type-body-small" style={{ opacity: 0.75 }}>
                {winner.firstPlaces} {winner.firstPlaces === 1 ? 'voto' : 'votos'} em 1º lugar
              </p>
            )}
          </div>
        </div>
      )}

      {showPodium && (
        <div className="fade-in">
          <h2 className="type-title-medium mb-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Classificação final
          </h2>
          <div className="space-y-2">
            {results.map((result, i) => {
              const medal = getMedal(result.rank);
              return (
                <div key={result.wineIndex} className="card-outlined flex items-center gap-3 fade-in"
                  style={{
                    animationDelay: `${i * 80}ms`, borderRadius: 'var(--shape-large)',
                    borderColor: result.rank === 1 ? medal.color : undefined,
                    borderWidth: result.rank === 1 ? 2 : undefined,
                    padding: '16px 20px 16px 16px',
                  }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: medal.bg }}>
                    <span className="type-title-small font-bold" style={{ color: medal.fg }}>
                      {result.rank}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>
                      {nameOf(result.wineIndex)}
                    </p>
                    {result.wine.grape && (
                      <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {result.wine.grape}
                      </p>
                    )}
                    <div className="taste-bar-track mt-2">
                      <div className="taste-bar-fill" style={{
                        width: `${max > 0 ? (result.totalPoints / max) * 100 : 0}%`,
                        background: medal.color,
                      }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="type-title-large font-bold" style={{
                      fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)',
                    }}>{result.totalPoints}</p>
                    <p className="type-label-small" style={{ color: 'var(--md-outline)' }}>/{max} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Como cada pessoa votou */}
      {showPodium && (
        <div className="fade-in">
          <h2 className="type-title-medium mb-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Voto a voto
          </h2>
          <div className="card-outlined overflow-hidden" style={{ borderRadius: 'var(--shape-large)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full type-body-small">
                <thead>
                  <tr style={{ background: 'var(--md-surface-container-highest)' }}>
                    <th className="text-left p-3 type-label-medium" style={{ color: 'var(--md-on-surface)' }}>Vinho</th>
                    {members.filter((m) => tasters.has(m.id)).map((m) => (
                      <th key={m.id} className="text-center p-3 type-label-medium"
                        style={{ color: 'var(--md-on-surface)', minWidth: 56 }}>
                        {m.name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.wineIndex} style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                      <td className="p-3">
                        <span className="type-body-small font-medium" style={{ color: 'var(--md-on-surface)' }}>
                          {nameOf(result.wineIndex)}
                        </span>
                      </td>
                      {members.filter((m) => tasters.has(m.id)).map((m) => {
                        const r = ratings.find((x) => x.user === m.id && x.wine_index === result.wineIndex);
                        const pos = r ? r.rank : null;
                        return (
                          <td key={m.id} className="text-center p-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full type-label-medium font-bold"
                              style={{
                                background: pos === 1 ? 'var(--md-tertiary-container)' : 'transparent',
                                color: pos === 1 ? 'var(--md-on-tertiary-container)' : 'var(--md-on-surface-variant)',
                              }}>
                              {pos ?? '–'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Notas de degustação */}
      {showPodium && ratings.some((r) => r.note_aroma || r.note_palate || r.note_finish) && (
        <div className="fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-primary)' }}>
              rate_review
            </span>
            <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
              Notas de degustação
            </h2>
          </div>
          <div className="space-y-3">
            {results.map((result) => {
              const forWine = ratings.filter(
                (r) => r.wine_index === result.wineIndex &&
                  (r.note_aroma || r.note_palate || r.note_finish),
              );
              if (forWine.length === 0) return null;
              return (
                <div key={result.wineIndex} className="card-outlined p-4" style={{ borderRadius: 'var(--shape-large)' }}>
                  <h3 className="type-title-small mb-3" style={{ color: 'var(--md-on-surface)' }}>
                    {nameOf(result.wineIndex)}
                  </h3>
                  <div className="space-y-3">
                    {forWine.map((r) => {
                      const member = members.find((m) => m.id === r.user);
                      return (
                        <div key={r.id} className="p-3" style={{
                          background: 'var(--md-surface-container)', borderRadius: 'var(--shape-medium)',
                        }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center type-label-small font-bold"
                              style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}>
                              {(member?.name || '?').charAt(0)}
                            </div>
                            <span className="type-label-medium" style={{ color: 'var(--md-on-surface)' }}>
                              {member?.name || 'Participante'}
                            </span>
                            {!!r.stars && r.stars > 0 && (
                              <span className="flex items-center ml-auto" aria-label={`${r.stars} estrelas`}>
                                {Array.from({ length: r.stars }).map((_, i) => (
                                  <span key={i} className="material-symbols-rounded ms-filled"
                                    style={{ fontSize: 14, color: 'var(--md-tertiary)' }}>star</span>
                                ))}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {r.note_aroma && (
                              <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                                <span style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>Aroma:</span> {r.note_aroma}
                              </p>
                            )}
                            {r.note_palate && (
                              <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                                <span style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>Boca:</span> {r.note_palate}
                              </p>
                            )}
                            {r.note_finish && (
                              <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                                <span style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>Final:</span> {r.note_finish}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showPodium && (
        <div className="fade-in">
          <Link to={`/events/${event.id}/expenses`} className="btn-primary w-full"
            style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>payments</span>
            Dividir a conta
          </Link>
        </div>
      )}
    </div>
  );
};
