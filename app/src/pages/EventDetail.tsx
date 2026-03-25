import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getEvent, getClub, saveEvent } from '../services/storage';
import { WineCard } from '../components/WineCard';

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const event = id ? getEvent(id) : undefined;
  const club = event ? getClub(event.clubId) : undefined;

  if (!event || !club) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-cream-dark flex items-center justify-center mb-4">
          <span className="text-3xl">😕</span>
        </div>
        <p className="text-charcoal-light mb-3">Event not found</p>
        <Link to="/clubs" className="text-burgundy font-semibold text-sm underline underline-offset-2">Back to clubs</Link>
      </div>
    );
  }

  const members = club.members.filter(m => event.memberIds.includes(m.id));

  const startTasting = () => {
    const updated = { ...event, status: 'tasting' as const };
    saveEvent(updated);
    toast.success('Tasting started!');
    navigate(`/events/${event.id}/tasting`);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <Link to={`/clubs/${club.id}`} className="text-sm text-gold-dark hover:text-gold font-medium inline-flex items-center gap-1 transition-colors min-h-[44px]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {club.name}
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div className="flex-1 min-w-0 mr-3">
            <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
              {event.name}
            </h1>
            <p className="text-sm text-charcoal-light mt-1">
              {new Date(event.date).toLocaleDateString('pt-BR')} · {event.type === 'blind' ? '🙈 Blind' : '👀 Open'}
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full shrink-0 ${
            event.status === 'completed' ? 'bg-green-50 text-green-700' :
            event.status === 'tasting' ? 'bg-gold/15 text-gold-dark' :
            'bg-cream-dark text-charcoal-light'
          }`}>
            {event.status}
          </span>
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark">
        <h2 className="font-semibold text-burgundy mb-3 text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>
          👥 Participants ({members.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <span key={m.id} className="flex items-center gap-1.5 bg-cream px-3 py-2 rounded-full text-sm min-h-[36px]">
              <span className="w-6 h-6 rounded-full bg-burgundy/10 flex items-center justify-center text-[11px] font-semibold text-burgundy">
                {m.name.charAt(0)}
              </span>
              <span className="font-medium text-charcoal text-xs">{m.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Wines — responsive grid on desktop */}
      <div>
        <h2 className="font-semibold text-burgundy mb-3 text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>
          🍷 Wines ({event.wines.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {event.wines.map((wine, i) => (
            <WineCard
              key={wine.id}
              wine={wine}
              blind={event.type === 'blind' && event.status !== 'completed'}
              blindLabel={`Wine ${String.fromCharCode(65 + i)}`}
            />
          ))}
        </div>
      </div>

      {/* Actions — 48px buttons */}
      <div className="space-y-3">
        {event.status === 'planning' && (
          <>
            <button
              onClick={startTasting}
              className="w-full bg-burgundy text-cream py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-md min-h-[48px]"
            >
              🍷 Start Tasting
            </button>
            <Link
              to={`/events/${event.id}/edit`}
              className="bg-white border border-cream-dark text-charcoal py-3.5 rounded-2xl font-medium hover:bg-cream transition-colors min-h-[48px] flex items-center justify-center"
            >
              ✏️ Edit Event
            </Link>
          </>
        )}

        {event.status === 'tasting' && (
          <Link
            to={`/events/${event.id}/tasting`}
            className="bg-burgundy text-cream py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-lg min-h-[48px] flex items-center justify-center"
          >
            🍷 Continue Tasting
          </Link>
        )}

        {event.status === 'completed' && (
          <>
            <Link
              to={`/events/${event.id}/results`}
              className="bg-burgundy text-cream py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-lg min-h-[48px] flex items-center justify-center"
            >
              🏆 View Results
            </Link>
            <Link
              to={`/events/${event.id}/expenses`}
              className="bg-gold text-white py-3.5 rounded-2xl font-semibold text-base hover:bg-gold-dark active:bg-gold-dark transition-colors shadow-lg min-h-[48px] flex items-center justify-center"
            >
              💰 Manage Expenses
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
