import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyClubs, getEvents, getMyPayments, getCurrentUser } from '../services/pocketbase';
import { formatBRL, formatEventDate } from '../utils/algorithms';
import { InstalarApp } from '../components/InstalarApp';
import type { Club, TastingEvent, Payment } from '../types';

/**
 * A home é o painel de quem já entrou. Quem não entrou vai para /entrar.
 *
 * Aqui moravam duas apresentações ao mesmo tempo. Esta rota tinha uma landing
 * própria — herói, "como funciona", uma citação — escrita antes do carrossel.
 * Quando o carrossel entrou, ele foi para a AuthPage e esta ficou, então o
 * domínio nu servia a versão antiga e o carrossel só aparecia por acidente,
 * quando o RequireAuth empurrava alguém para /entrar.
 *
 * Pior que a duplicação: a landing antiga vinha dentro do Layout, com a barra
 * inferior de Início/Clubes/Perfil e um "Criar um clube" que, deslogado,
 * batiam todos em /entrar. A primeira tela do produto oferecia quatro caminhos
 * e nenhum deles levava a lugar nenhum.
 */
export const Home: React.FC = () => {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/entrar" replace />;
  return <Dashboard />;
};

// ── Para quem já entrou ──

const Dashboard: React.FC = () => {
  const me = getCurrentUser();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<TastingEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const myClubs = await getMyClubs();
        if (cancelled) return;
        setClubs(myClubs);
        const perClub = await Promise.all(myClubs.map((c) => getEvents(c.id)));
        if (cancelled) return;
        setEvents(perClub.flat());
        setPayments(await getMyPayments());
      } catch { /* o painel degrada para vazio; as telas internas explicam o erro */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = (me?.display_name || '').split(' ')[0];

  const active = events
    .filter((e) => e.status === 'tasting')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const upcoming = events
    .filter((e) => e.status === 'upcoming')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const iOwe = payments.filter((p) => p.debtor === me?.id && p.status === 'pending');
  const toConfirm = payments.filter((p) => p.creditor === me?.id && p.status === 'paid');

  const clubOf = (id: string) => clubs.find((c) => c.id === id)?.name || 'Clube';

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ padding: '28px 0 20px' }}>
        <p data-testid="greeting" style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', letterSpacing: '0.04em' }}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 30, fontWeight: 700,
          color: 'var(--md-on-surface)', marginTop: 4,
        }}>Wine Circle</h1>
      </div>

      {loading && (
        <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>Carregando...</p>
      )}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* O que exige ação agora */}
          {active.length > 0 && (
            <section data-testid="active-tastings">
              <p className="section-label" style={{ marginBottom: 8 }}>Acontecendo agora</p>
              {active.map((e) => (
                <Link key={e.id} to={`/events/${e.id}/tasting`} className="card-outlined"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                    borderRadius: 'var(--shape-large)', textDecoration: 'none',
                    borderColor: 'var(--md-primary)', marginBottom: 8,
                  }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: 'var(--md-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-rounded ms-filled" style={{ fontSize: 22, color: '#fff' }}>
                      wine_bar
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>{e.title}</p>
                    <p className="type-body-small" style={{ color: 'var(--md-primary)' }}>
                      Degustação em andamento — enviar meu ranking
                    </p>
                  </div>
                  <span className="material-symbols-rounded" aria-hidden="true"
                    style={{ fontSize: 20, color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
                </Link>
              ))}
            </section>
          )}

          {(iOwe.length > 0 || toConfirm.length > 0) && (
            <Link to="/profile" data-testid="pending-money" className="card-outlined"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                borderRadius: 'var(--shape-large)', textDecoration: 'none',
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: 'rgba(176,101,26,0.14)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#B0651A' }}>payments</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {iOwe.length > 0 && (
                  <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>
                    Você deve {formatBRL(iOwe.reduce((s, p) => s + p.amount, 0))}
                  </p>
                )}
                {toConfirm.length > 0 && (
                  <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                    {toConfirm.length} {toConfirm.length > 1 ? 'pagamentos aguardam' : 'pagamento aguarda'} sua confirmação
                  </p>
                )}
              </div>
              <span className="material-symbols-rounded" aria-hidden="true"
                style={{ fontSize: 20, color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
            </Link>
          )}

          {/* Próximos eventos */}
          <section>
            <p className="section-label" style={{ marginBottom: 8 }}>Próximas degustações</p>
            {upcoming.length === 0 ? (
              <div className="card-outlined" style={{ padding: 20, borderRadius: 'var(--shape-large)' }}>
                <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
                  {clubs.length === 0
                    ? 'Você ainda não está em nenhum clube. Crie o seu e chame o pessoal.'
                    : 'Nenhum evento marcado. Que tal criar um?'}
                </p>
                <Link to={clubs.length === 0 ? '/clubs/new' : `/clubs/${clubs[0].id}/events/new`}
                  className="btn-primary" style={{ marginTop: 14, height: 44, borderRadius: 'var(--shape-large)' }}>
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>add</span>
                  {clubs.length === 0 ? 'Criar meu clube' : 'Criar evento'}
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.slice(0, 4).map((e) => (
                  <Link key={e.id} to={`/events/${e.id}`} className="card-outlined"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                      borderRadius: 'var(--shape-large)', textDecoration: 'none',
                    }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      background: 'var(--md-surface-container-high)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-rounded" style={{
                        fontSize: 22, color: 'var(--md-on-surface-variant)',
                      }}>{e.type === 'blind' ? 'visibility_off' : 'event_note'}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>{e.title}</p>
                      <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {clubOf(e.club)} · {formatEventDate(e.date)}
                        {e.type === 'blind' ? ' · às cegas' : ''}
                      </p>
                    </div>
                    <span className="material-symbols-rounded" aria-hidden="true"
                      style={{ fontSize: 20, color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Instalar — só depois que a pessoa já tem um clube.
              Pedir na porta, antes de qualquer valor, é o jeito mais rápido de
              o convite ser ignorado para sempre. */}
          {clubs.length > 0 && <InstalarApp />}

          {/* Meus clubes */}
          {clubs.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <p className="section-label">Meus clubes</p>
                <Link to="/clubs" className="btn-text" style={{ fontSize: 13 }}>Ver todos</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clubs.slice(0, 3).map((c) => (
                  <Link key={c.id} to={`/clubs/${c.id}`} className="card-outlined"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                      borderRadius: 'var(--shape-large)', textDecoration: 'none',
                    }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--md-primary-container)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'var(--md-on-primary-container)', fontWeight: 700,
                    }}>{c.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="type-title-small" style={{ color: 'var(--md-on-surface)' }}>{c.name}</p>
                      <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {(c.members || []).length} {(c.members || []).length === 1 ? 'membro' : 'membros'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
