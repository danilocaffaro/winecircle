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
  const [revealStep, setRevealStep] = useState(0); // 0=hidden, 1=drumroll, 2=winner

  useEffect(() => {
    // Auto-start reveal animation after mount
    const t = setTimeout(() => setRevealStep(1), 400);
    return () => clearTimeout(t);
  }, []);

  if (!event || !club) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-3">😕</span>
        <p className="text-charcoal-muted">Event not found</p>
      </div>
    );
  }

  const results = calculateBordaCount(event.wines, event.rankings);
  const members = club.members.filter(m => event.memberIds.includes(m.id));
  const maxPoints = event.wines.length * event.rankings.length;
  const winner = results[0];

  const getMedal = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: '#F59E0B', label: 'Gold' };
    if (rank === 2) return { emoji: '🥈', color: '#9CA3AF', label: 'Silver' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32', label: 'Bronze' };
    return { emoji: `#${rank}`, color: 'var(--charcoal-muted)', label: `#${rank}` };
  };

  const doReveal = () => {
    setRevealStep(2);
    setTimeout(() => setRevealed(true), 600);
    setTimeout(() => setShowPodium(true), 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      {/* Back */}
      <Link
        to={`/events/${event.id}`}
        className="text-sm text-gold-dark hover:text-gold font-medium inline-flex items-center gap-1 transition-colors min-h-[44px]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to event
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          🏆 Results
        </h1>
        <p className="text-sm text-charcoal-muted mt-0.5">{event.name}</p>
      </div>

      {/* ── REVEAL SEQUENCE ── */}
      {revealStep === 1 && !revealed && (
        <div
          className="card p-8 text-center cursor-pointer fade-in"
          onClick={doReveal}
          role="button"
          aria-label="Reveal winner"
        >
          <div className="w-24 h-24 mx-auto mb-5 rounded-full wine-gradient-dark flex items-center justify-center shadow-xl">
            <span className="text-5xl animate-pulse">🙈</span>
          </div>
          <h2 className="text-xl font-bold text-burgundy mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Ready for the Reveal?
          </h2>
          <p className="text-charcoal-muted text-sm mb-6">
            {event.type === 'blind'
              ? `The wines have been judged blind. Let's see which one conquered ${event.rankings.length} taster${event.rankings.length !== 1 ? 's' : ''}.`
              : `${event.rankings.length} taster${event.rankings.length !== 1 ? 's' : ''} have cast their votes. The winner is...`}
          </p>
          <button className="btn-primary px-10 text-base">
            🥁 Reveal Winner
          </button>
        </div>
      )}

      {/* ── WINNER SPOTLIGHT ── */}
      {revealStep === 2 && winner && (
        <div
          className={`relative overflow-hidden rounded-3xl text-cream shadow-2xl transition-all duration-700 ${
            revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            background: 'linear-gradient(135deg, #3D0C11 0%, #7B2D3A 40%, #9B3D4C 70%, #5A1F29 100%)',
          }}
        >
          {/* Decorative dots */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '32px 32px, 24px 24px',
          }} />
          {/* Gold shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />

          <div className="relative px-8 py-10 text-center">
            <p className="text-gold text-xs font-bold tracking-[0.2em] uppercase mb-3">🏆 Winner</p>
            <div
              className={`transition-all duration-700 delay-300 ${
                revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <h2 className="text-3xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                {winner.wine.name}
              </h2>
              {winner.wine.producer && (
                <p className="text-cream/70 text-sm mb-1">{winner.wine.producer}</p>
              )}
              {(winner.wine.region || winner.wine.country) && (
                <p className="text-cream/50 text-xs mb-4">
                  {[winner.wine.region, winner.wine.country].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-4xl font-black text-gold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {winner.totalPoints}
                </span>
                <span className="text-cream/50 text-sm">/ {maxPoints} pts</span>
              </div>
              {/* Who voted for it */}
              {event.rankings.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                  {event.rankings
                    .filter(r => r.wineOrder[0] === winner.wineId)
                    .map(r => {
                      const m = members.find(x => x.id === r.memberId);
                      return m ? (
                        <span key={m.id} className="text-xs bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
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
          <h2 className="font-bold text-burgundy mb-4 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            Final Rankings
          </h2>
          <div className="space-y-2">
            {results.map((result, i) => {
              const medal = getMedal(result.rank);
              return (
                <div
                  key={result.wineId}
                  className={`card p-4 flex items-center gap-3 fade-in`}
                  style={{ animationDelay: `${i * 80}ms`, border: result.rank === 1 ? '2px solid var(--gold)' : undefined }}
                >
                  <span className="text-2xl w-10 text-center flex-shrink-0">{medal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-burgundy text-sm truncate">{result.wine.name}</h3>
                    {result.wine.grape && <p className="text-xs text-charcoal-muted">{result.wine.grape}</p>}
                    {/* Progress bar */}
                    <div className="taste-bar-track mt-2">
                      <div
                        className="taste-bar-fill"
                        style={{ width: `${(result.totalPoints / maxPoints) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-burgundy">{result.totalPoints}</p>
                    <p className="text-[10px] text-charcoal-muted">/{maxPoints} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL RANKINGS TABLE ── */}
      {showPodium && (
        <div className="fade-in">
          <h2 className="font-bold text-burgundy mb-4 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            Individual Rankings
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream-dark">
                    <th className="text-left p-3 text-burgundy font-semibold">Wine</th>
                    {members.map(m => (
                      <th key={m.id} className="text-center p-3 text-burgundy font-semibold min-w-[56px]">
                        {m.name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(result => (
                    <tr key={result.wineId} className="border-t border-cream-dark">
                      <td className="p-3 font-medium text-burgundy text-xs">
                        {getMedal(result.rank).emoji} {result.wine.name}
                      </td>
                      {members.map(member => {
                        const ranking = event.rankings.find(r => r.memberId === member.id);
                        const pos = ranking ? ranking.wineOrder.indexOf(result.wineId) + 1 : '-';
                        return (
                          <td key={member.id} className="text-center p-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              pos === 1 ? 'bg-gold/20 text-gold-dark' :
                              pos === 2 ? 'bg-gray-200 text-charcoal' :
                              'bg-cream text-charcoal-muted'
                            }`}>
                              {pos}
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

      {/* ── TASTING NOTES ── */}
      {showPodium && event.rankings.some(r => r.notes && Object.keys(r.notes).length > 0) && (
        <div className="fade-in">
          <h2 className="font-bold text-burgundy mb-4 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            📝 Tasting Notes
          </h2>
          <div className="space-y-3">
            {results.map(result => {
              const notesForWine = event.rankings
                .filter(r => r.notes?.[result.wineId])
                .map(r => ({
                  member: members.find(m => m.id === r.memberId),
                  note: r.notes![result.wineId],
                }))
                .filter(x => x.member);

              if (notesForWine.length === 0) return null;
              return (
                <div key={result.wineId} className="card p-4">
                  <h3 className="font-semibold text-burgundy text-sm mb-3">
                    {getMedal(result.rank).emoji} {result.wine.name}
                  </h3>
                  <div className="space-y-3">
                    {notesForWine.map(({ member, note }) => (
                      <div key={member!.id} className="bg-cream rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full wine-gradient-red flex items-center justify-center text-cream text-xs font-bold">
                            {member!.name.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold text-charcoal">{member!.name}</span>
                          {note.rating > 0 && (
                            <span className="text-xs text-gold ml-auto">{Array(note.rating).fill('★').join('')}</span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-charcoal-muted">
                          {note.aroma && <p><span className="font-semibold text-charcoal">Aroma:</span> {note.aroma}</p>}
                          {note.palate && <p><span className="font-semibold text-charcoal">Palate:</span> {note.palate}</p>}
                          {note.finish && <p><span className="font-semibold text-charcoal">Finish:</span> {note.finish}</p>}
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

      {/* ── ACTIONS ── */}
      {showPodium && (
        <div className="fade-in">
          <Link
            to={`/events/${event.id}/expenses`}
            className="btn-primary w-full text-base"
          >
            💰 Split Expenses
          </Link>
        </div>
      )}
    </div>
  );
};
