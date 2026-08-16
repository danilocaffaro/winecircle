import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatEventDate } from '../utils/algorithms';
import toast from 'react-hot-toast';
import { getEvent, getClub, updateEvent, getMembers, describeError } from '../services/pocketbase';
import { WineCard } from '../components/WineCard';
import type { Member, Club, TastingEvent } from '../types';

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<TastingEvent | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const evt = await getEvent(id);
        setEvent(evt);
        const c = await getClub(evt.club);
        setClub(c);
        // Resolve participants
        const participantIds: string[] = evt.participants || [];
        if (participantIds.length > 0) {
          setMembers(await getMembers(participantIds));
        }
      } catch {
        // estado de erro tratado abaixo
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const startTasting = async () => {
    if (!event) return;
    try {
      await updateEvent(event.id, { status: 'tasting' });
      toast.success('Degustação iniciada!');
      navigate(`/events/${event.id}/tasting`);
    } catch (err) {
      toast.error(describeError(err));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

  if (!event || !club) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--md-surface-container-highest)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 32, color: 'var(--md-on-surface-variant)' }}>error_outline</span>
        </div>
        <p className="type-body-medium mb-3" style={{ color: 'var(--md-on-surface-variant)' }}>Evento não encontrado</p>
        <Link to="/clubs" className="btn-text">Voltar aos clubes</Link>
      </div>
    );
  }

  const wines = event.wines || [];
  const status = event.status || 'upcoming';

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Back */}
      <Link to={`/clubs/${club.id}`} className="btn-text inline-flex items-center" style={{ paddingLeft: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        {club.name}
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 mr-3">
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            {event.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-on-surface-variant)' }}>event</span>
            <span className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
              {formatEventDate(event.date)}
            </span>
            <span style={{ color: 'var(--md-outline)' }}>·</span>
            <span className="flex items-center gap-1 type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{event.type === 'blind' ? 'visibility_off' : 'visibility'}</span>
              {event.type === 'blind' ? 'às cegas' : 'aberta'}
            </span>
          </div>
        </div>
        <span className="chip chip-selected type-label-small" style={{
          background: status === 'completed' ? 'var(--md-tertiary-container)' :
                     status === 'tasting' ? 'var(--md-secondary-container)' :
                     'var(--md-surface-container-highest)',
          color: status === 'completed' ? 'var(--md-on-tertiary-container)' :
                 status === 'tasting' ? 'var(--md-on-secondary-container)' :
                 'var(--md-on-surface-variant)',
          borderColor: 'transparent',
        }}>
          {status === 'completed' ? 'concluído' : status === 'tasting' ? 'em andamento' : 'marcado'}
        </span>
      </div>

      {/* Participants */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>group</span>
          <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Participantes ({members.length})
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <span key={m.id} className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: 'var(--md-surface-container)', minHeight: 36 }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center type-label-small font-bold"
                style={{ background: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)' }}>
                {m.name.charAt(0)}
              </span>
              <span className="type-label-medium" style={{ color: 'var(--md-on-surface)' }}>{m.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Wines */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>wine_bar</span>
          <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Vinhos ({wines.length})
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wines.map((wine, i) => (
            <WineCard
              key={wine.id}
              wine={wine}
              blind={event.type === 'blind' && status !== 'completed'}
              blindLabel={`Wine ${String.fromCharCode(65 + i)}`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {status === 'upcoming' && (
          <>
            <button onClick={startTasting} data-testid="start-tasting" className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
              <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>wine_bar</span>
              Iniciar degustação
            </button>
            <Link to={`/events/${event.id}/edit`} className="btn-outlined w-full flex items-center justify-center" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 20 }}>edit</span>
              Editar evento
            </Link>
          </>
        )}

        {status === 'tasting' && (
          <Link to={`/events/${event.id}/tasting`} className="btn-primary w-full flex items-center justify-center" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>wine_bar</span>
            Continuar degustação
          </Link>
        )}

        {status === 'completed' && (
          <>
            <Link to={`/events/${event.id}/results`} className="btn-primary w-full flex items-center justify-center" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
              <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>emoji_events</span>
              Ver resultado
            </Link>
            <Link to={`/events/${event.id}/expenses`} className="btn-tonal w-full flex items-center justify-center" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
              <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20 }}>payments</span>
              Dividir a conta
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
