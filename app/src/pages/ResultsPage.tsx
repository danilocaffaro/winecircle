import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, getClub } from '../services/storage';
import { calculateBordaCount } from '../utils/algorithms';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const event = id ? getEvent(id) : undefined;
  const club = event ? getClub(event.clubId) : undefined;
  const [revealed, setRevealed] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setRevealStep(1), 400);
    return () => clearTimeout(t);
  }, []);

  if (!event || !club) {
    return (
      <div className="text-center py-16 space-y-4">
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>error_outline</span>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>Event not found</p>
        <Link to="/clubs" className="btn-outlined inline-flex items-center gap-1" style={{ borderRadius: 'var(--shape-full)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Back to Clubs
        </Link>
      </div>
    );
  }

  const results = calculateBordaCount(event.wines, event.rankings);
  const members = club.members.filter(m => event.memberIds.includes(m.id));
  const maxPoints = event.wines.length * event.rankings.length;
  const winner = results[0];

  const getMedal = (rank: number) => {
    if (rank === 1) return { icon: 'military_tech', color: 'var(--md-tertiary)', bg: 'var(--md-tertiary-container)', fg: 'var(--md-on-tertiary-container)' };
    if (rank === 2) return { icon: 'military_tech', color: '#9CA3AF', bg: '#F3F4F6', fg: '#4B5563' };
    if (rank === 3) return { icon: 'military_tech', color: '#CD7F32', bg: '#FEF3E2', fg: '#7C4A15' };
    return { icon: 'tag', color: 'var(--md-outline)', bg: 'var(--md-surface-container)', fg: 'var(--md-on-surface-variant)' };
  };

  const doReveal = () => {
    setRevealStep(2);
    setTimeout(() => setRevealed(true), 600);
    setTimeout(() => setShowPodium(true), 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">

      {/* Back */}
      <Link to={`/events/${event.id}`} className="btn-text inline-flex items-center" style={{ paddingLeft: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        Back to event
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-tertiary)' }}>emoji_events</span>
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Results
          </h1>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{event.name}</p>
      </div>

      {/* ── REVEAL SCREEN ── */}
      {revealStep === 1 && !revealed && (
        <div
          className="card-elevated p-8 text-center cursor-pointer fade-in"
          onClick={doReveal}
          role="button"
          style={{ borderRadius: 'var(--shape-extra-large)' }}
        >
          <div
            className="w-24 h-24 mx-auto mb-5 rounded-full wine-gradient-dark flex items-center justify-center"
            style={{ boxShadow: '0 4px 12px rgba(60,12,17,0.3)' }}
          >
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 48, color: 'var(--md-primary-container)', animation: 'pulse 2s infinite' }}>
              visibility_off
            </span>
          </div>
          <h2 className="type-title-large mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Ready for the Reveal?
          </h2>
          <p className="type-body-medium mb-6" style={{ color: 'var(--md-on-surface-variant)' }}>
            {event.rankings.length === 0
              ? 'Complete the blind tasting first, then return here to reveal the winner.'
              : event.type === 'blind'
              ? `The wines have been judged blind by ${event.rankings.length} taster${event.rankings.length !== 1 ? 's' : ''}. Let's reveal the winner!`
              : `${event.rankings.length} taster${event.rankings.length !== 1 ? 's' : ''} have cast their votes. The winner is...`}
          </p>
          <button className="btn-primary px-10">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>music_note</span>
            Reveal Winner
          </button>
        </div>
      )}

      {/* ── WINNER ── */}
      {revealStep === 2 && winner && (
        <div
          className={`relative overflow-hidden text-white transition-all duration-700 ${revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          style={{
            background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-secondary) 40%, var(--md-primary-container) 70%, var(--md-primary) 100%)',
            borderRadius: 'var(--shape-extra-large)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />

          <div className="relative px-8 py-10 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: '#D4AB5C' }}>emoji_events</span>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#D4AB5C' }}>Winner</p>
            </div>
            <div className={`transition-all duration-700 delay-300 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className="type-headline-medium font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                {winner.wine.name}
              </h2>
              {winner.wine.producer && <p className="type-body-medium" style={{ opacity: 0.7 }}>{winner.wine.producer}</p>}
              {(winner.wine.region || winner.wine.country) && (
                <p className="type-body-small mt-0.5" style={{ opacity: 0.5 }}>
                  {[winner.wine.region, winner.wine.country].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="flex items-center justify-center gap-3 my-4">
                <span className="type-display-small font-black" style={{ fontFamily: 'Playfair Display, serif', color: '#D4AB5C' }}>
                  {winner.totalPoints}
                </span>
                <span className="type-body-small" style={{ opacity: 0.5 }}>/ {maxPoints} pts</span>
              </div>
              {event.rankings.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {event.rankings.filter(r => r.wineOrder[0] === winner.wineId).map(r => {
                    const m = members.find(x => x.id === r.memberId);
                    return m ? (
                      <span key={m.id} className="type-label-small" style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 'var(--shape-full)' }}>
                        {m.name} voted #1
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PODIUM ── */}
      {showPodium && (
        <div className={`transition-all duration-500 ${showPodium ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="type-title-medium mb-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Final Rankings
          </h2>
          <div className="space-y-2">
            {results.map((result, i) => {
              const medal = getMedal(result.rank);
              return (
                <div
                  key={result.wineId}
                  className="card-outlined flex items-center gap-3 fade-in"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    borderRadius: 'var(--shape-large)',
                    borderColor: result.rank === 1 ? medal.color : undefined,
                    borderWidth: result.rank === 1 ? 2 : undefined,
                    padding: '16px 20px 16px 16px',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: medal.bg }}
                  >
                    <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: medal.fg }}>{medal.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-title-small truncate" style={{ color: 'var(--md-on-surface)' }}>{result.wine.name}</p>
                    {result.wine.grape && <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>{result.wine.grape}</p>}
                    <div className="taste-bar-track mt-2">
                      <div className="taste-bar-fill" style={{ width: `${(result.totalPoints / maxPoints) * 100}%`, background: medal.color }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="type-title-large font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)' }}>{result.totalPoints}</p>
                    <p className="type-label-small" style={{ color: 'var(--md-outline)' }}>/{maxPoints} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL RANKINGS ── */}
      {showPodium && (
        <div className="fade-in">
          <h2 className="type-title-medium mb-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Individual Rankings
          </h2>
          <div className="card-outlined overflow-hidden" style={{ borderRadius: 'var(--shape-large)' }}>
            <div className="overflow-x-auto">
              <table className="w-full type-body-small">
                <thead>
                  <tr style={{ background: 'var(--md-surface-container-highest)' }}>
                    <th className="text-left p-3 type-label-medium" style={{ color: 'var(--md-on-surface)' }}>Wine</th>
                    {members.map(m => (
                      <th key={m.id} className="text-center p-3 type-label-medium min-w-[56px]" style={{ color: 'var(--md-on-surface)' }}>
                        {m.name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(result => {
                    const medal = getMedal(result.rank);
                    return (
                      <tr key={result.wineId} style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 16, color: medal.fg }}>{medal.icon}</span>
                            <span className="type-body-small font-medium" style={{ color: 'var(--md-on-surface)' }}>{result.wine.name}</span>
                          </div>
                        </td>
                        {members.map(member => {
                          const ranking = event.rankings.find(r => r.memberId === member.id);
                          const pos = ranking ? ranking.wineOrder.indexOf(result.wineId) + 1 : '-';
                          return (
                            <td key={member.id} className="text-center p-3">
                              <span
                                className="inline-flex items-center justify-center w-7 h-7 rounded-full type-label-medium font-bold"
                                style={{
                                  background: pos === 1 ? 'var(--md-tertiary-container)' : pos === 2 ? 'var(--md-surface-container-highest)' : 'transparent',
                                  color: pos === 1 ? 'var(--md-on-tertiary-container)' : 'var(--md-on-surface-variant)',
                                }}
                              >
                                {pos}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TASTING NOTES ── */}
      {showPodium && event.rankings.some(r => r.notes && Object.keys(r.notes).length > 0) && (
        <div className="fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--md-primary)' }}>rate_review</span>
            <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
              Tasting Notes
            </h2>
          </div>
          <div className="space-y-3">
            {results.map(result => {
              const notesForWine = event.rankings
                .filter(r => r.notes?.[result.wineId])
                .map(r => ({ member: members.find(m => m.id === r.memberId), note: r.notes![result.wineId] }))
                .filter(x => x.member);
              if (notesForWine.length === 0) return null;
              const medal = getMedal(result.rank);
              return (
                <div key={result.wineId} className="card-outlined p-4" style={{ borderRadius: 'var(--shape-large)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-rounded ms-filled" style={{ fontSize: 16, color: medal.fg }}>{medal.icon}</span>
                    <h3 className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>{result.wine.name}</h3>
                  </div>
                  <div className="space-y-3">
                    {notesForWine.map(({ member, note }) => (
                      <div key={member!.id} className="p-3" style={{ background: 'var(--md-surface-container)', borderRadius: 'var(--shape-medium)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center type-label-small font-bold"
                            style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                          >
                            {member!.name.charAt(0)}
                          </div>
                          <span className="type-label-medium" style={{ color: 'var(--md-on-surface)' }}>{member!.name}</span>
                          {note.rating > 0 && (
                            <span className="flex items-center ml-auto">
                              {[...Array(note.rating)].map((_, i) => (
                                <span key={i} className="material-symbols-rounded ms-filled" style={{ fontSize: 14, color: 'var(--md-tertiary)' }}>star</span>
                              ))}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {note.aroma && <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}><span style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>Aroma:</span> {note.aroma}</p>}
                          {note.palate && <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}><span style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>Palate:</span> {note.palate}</p>}
                          {note.finish && <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}><span style={{ fontWeight: 500, color: 'var(--md-on-surface)' }}>Finish:</span> {note.finish}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SPLIT EXPENSES CTA ── */}
      {showPodium && (
        <div className="fade-in">
          <Link to={`/events/${event.id}/expenses`} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>payments</span>
            Split Expenses
          </Link>
        </div>
      )}
    </div>
  );
};
