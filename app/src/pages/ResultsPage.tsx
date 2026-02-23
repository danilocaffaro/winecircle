import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEvent, getClub } from '../services/storage';
import { calculateBordaCount } from '../utils/algorithms';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const event = id ? getEvent(id) : undefined;
  const club = event ? getClub(event.clubId) : undefined;

  if (!event || !club) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-3">😕</span>
        <p className="text-charcoal-light">Event not found</p>
      </div>
    );
  }

  const results = calculateBordaCount(event.wines, event.rankings);
  const members = club.members.filter(m => event.memberIds.includes(m.id));
  const maxPoints = event.wines.length * event.rankings.length;

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link to={`/events/${event.id}`} className="text-sm text-gold-dark hover:text-gold font-medium mb-2 inline-flex items-center gap-1 transition-colors min-h-[44px]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to event
        </Link>
        <h1 className="text-2xl font-bold text-burgundy mt-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          🏆 Results
        </h1>
        <p className="text-sm text-charcoal-light mt-0.5">{event.name}</p>
      </div>

      {/* Winner Spotlight */}
      {results.length > 0 && (
        <div className="bg-gradient-to-br from-burgundy via-burgundy to-burgundy-dark text-cream rounded-2xl p-6 sm:p-8 text-center shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <span className="text-5xl block mb-3">🏆</span>
            <p className="text-gold text-sm font-medium tracking-wide uppercase mb-1">Winner</p>
            <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
              {results[0].wine.name}
            </h2>
            {results[0].wine.producer && (
              <p className="text-cream/70 text-sm">{results[0].wine.producer}</p>
            )}
            <p className="text-gold text-xl font-bold mt-3">
              {results[0].totalPoints} points
            </p>
          </div>
        </div>
      )}

      {/* Full Rankings */}
      <div>
        <h2 className="font-semibold text-burgundy mb-3 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
          Final Rankings (Borda Count)
        </h2>
        <div className="space-y-2">
          {results.map(result => (
            <div
              key={result.wineId}
              className={`bg-white rounded-xl p-4 sm:p-5 shadow-sm flex items-center gap-3 transition-all duration-200 ${
                result.rank === 1 ? 'border-2 border-gold ring-2 ring-gold/10' : 'border border-cream-dark'
              }`}
            >
              <div className="text-2xl w-10 text-center shrink-0">
                {getMedalEmoji(result.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-burgundy truncate">{result.wine.name}</h3>
                {result.wine.grape && (
                  <p className="text-xs text-charcoal-light">{result.wine.grape}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>{result.totalPoints}</p>
                <p className="text-[11px] text-charcoal-light/60">/{maxPoints} pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Rankings Comparison */}
      <div>
        <h2 className="font-semibold text-burgundy mb-3 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
          Individual Rankings
        </h2>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm bg-white rounded-xl shadow-md border border-cream-dark overflow-hidden">
            <thead>
              <tr className="bg-cream-dark">
                <th className="text-left p-3 sm:p-4 text-burgundy font-semibold">Wine</th>
                {members.map(m => (
                  <th key={m.id} className="text-center p-3 sm:p-4 text-burgundy font-semibold min-w-[60px]">
                    {m.name.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <tr key={result.wineId} className="border-t border-cream-dark">
                  <td className="p-3 sm:p-4 font-medium text-burgundy">
                    {getMedalEmoji(result.rank)} {result.wine.name}
                  </td>
                  {members.map(member => {
                    const ranking = event.rankings.find(r => r.memberId === member.id);
                    const position = ranking ? ranking.wineOrder.indexOf(result.wineId) + 1 : '-';
                    return (
                      <td key={member.id} className="text-center p-3 sm:p-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                          position === 1 ? 'bg-gold/20 text-gold-dark' :
                          position === 2 ? 'bg-gray-200 text-charcoal' :
                          'bg-cream text-charcoal-light'
                        }`}>
                          {position}
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

      {/* Actions — 48px buttons */}
      <div className="space-y-3">
        <Link
          to={`/events/${event.id}/expenses`}
          className="bg-gold text-white py-3.5 rounded-2xl font-semibold text-base hover:bg-gold-dark active:bg-gold-dark transition-colors shadow-lg min-h-[48px] flex items-center justify-center"
        >
          💰 Split Expenses
        </Link>
      </div>
    </div>
  );
};
