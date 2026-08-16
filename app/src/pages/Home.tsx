import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyClubs, getEvents, getMyPayments, getCurrentUser } from '../services/pocketbase';
import { formatBRL, formatEventDate } from '../utils/algorithms';
import { InstalarApp } from '../components/InstalarApp';
import type { Club, TastingEvent, Payment } from '../types';

/**
 * Home com dois rostos (A-17).
 *
 * A versão anterior era uma landing estática — herói, "how it works", uma
 * citação — servida igual para quem abria o app pela primeira e pela décima
 * vez. Não mostrava próximo evento, clube nem pagamento pendente, e o botão
 * "Create a Club" levava à listagem em vez do formulário.
 */
export const Home: React.FC = () => {
  const { authenticated } = useAuth();
  return authenticated ? <Dashboard /> : <Landing />;
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

// ── Para quem ainda não entrou ──

const Landing: React.FC = () => (
  <div style={{ paddingBottom: 32 }}>
    <div className="fade-in" style={{
      margin: '0 -16px', padding: '48px 24px 40px',
      background: 'linear-gradient(160deg, var(--md-primary-container) 0%, var(--md-surface-container-low) 60%)',
      borderBottom: '1px solid var(--md-outline-variant)',
      position: 'relative', overflow: 'hidden',
    }}>
      <h1 style={{
        fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 700,
        lineHeight: 1.15, color: 'var(--md-on-surface)', marginBottom: 12,
        letterSpacing: '-0.5px',
      }}>
        Prove o vinho,<br />
        <span style={{ color: 'var(--md-primary)' }}>não o rótulo.</span>
      </h1>
      <p style={{
        fontSize: 15, lineHeight: 1.6, color: 'var(--md-on-surface-variant)',
        marginBottom: 28, maxWidth: 320,
      }}>
        Degustações às cegas com os amigos. Cada um avalia no próprio celular,
        e no fim o app revela o vencedor e divide a conta.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/clubs/new" className="btn-primary" style={{ fontWeight: 600, fontSize: 14 }}>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>add</span>
          Criar um clube
        </Link>
      </div>
    </div>

    <div style={{ marginTop: 32 }} className="fade-in fade-in-delay-1">
      <p className="section-label" style={{ marginBottom: 20 }}>Como funciona</p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {[
          { n: '01', title: 'Crie seu clube', desc: 'Chame os amigos por um link. Marque a data.', icon: 'group_add' },
          { n: '02', title: 'Cada um avalia', desc: 'Todo mundo ordena os vinhos no próprio celular, sem ver o rótulo.', icon: 'smartphone' },
          { n: '03', title: 'Revele e acerte', desc: 'O app apura os votos, mostra o vencedor e divide a conta no Pix.', icon: 'celebration' },
        ].map((step, i) => (
          <div key={step.n} style={{
            display: 'flex', gap: 16, padding: '20px 0',
            borderBottom: i < 2 ? '1px solid var(--md-outline-variant)' : 'none',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--md-primary-container)',
            }}>
              <span className="material-symbols-rounded ms-filled" aria-hidden="true"
                style={{ fontSize: 20, color: 'var(--md-on-primary-container)' }}>{step.icon}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--md-outline)' }}>{step.n}</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>{step.title}</p>
              </div>
              <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', lineHeight: 1.5 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="fade-in fade-in-delay-2" style={{
      marginTop: 32, padding: '24px 20px',
      background: 'var(--md-surface-container)', borderRadius: 16,
      border: '1px solid var(--md-outline-variant)',
    }}>
      <p style={{
        fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600,
        color: 'var(--md-on-surface)', marginBottom: 8, lineHeight: 1.3,
      }}>
        Sem o rótulo, o paladar decide.
      </p>
      <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', lineHeight: 1.6 }}>
        Numa degustação às cegas, uma garrafa de R$45 ganha de uma de R$300 com
        frequência desconfortável. O objetivo do Wine Circle é justamente esse
        constrangimento — descobrir o que você realmente gosta.
      </p>
    </div>
  </div>
);

export default Home;
