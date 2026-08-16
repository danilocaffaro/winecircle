import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  updateProfile, getMyPayments, getMyClubs, getEvents, getMyRatings,
  describeError,
} from '../services/pocketbase';
import { formatBRL, formatEventDate } from '../utils/algorithms';
import { InstalarApp } from '../components/InstalarApp';
import type { Club, TastingEvent, Payment, Wine } from '../types';

/**
 * Perfil lendo do PocketBase (A-06).
 *
 * A versão anterior importava getClubs/getEvents de services/storage.ts — o
 * wrapper de localStorage abandonado na migração para o backend. Nada escrevia
 * ali havia meses, então estatísticas, conquistas, histórico e coleção de
 * vinhos ficavam permanentemente em zero para todo mundo, e o link do
 * histórico apontava para /event/:clubId/:id, rota que não existe.
 */
export const ProfilePage: React.FC = () => {
  const { authenticated, user, logout, refreshUser } = useAuth();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<TastingEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tastedWineIds, setTastedWineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [editingPix, setEditingPix] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'wines'>('stats');

  useEffect(() => {
    setPixKey(user?.pix_key || '');
    setDisplayName(user?.display_name || '');
  }, [user]);

  const load = useCallback(async () => {
    if (!authenticated) { setLoading(false); return; }
    try {
      const myClubs = await getMyClubs();
      setClubs(myClubs);

      const perClub = await Promise.all(myClubs.map((c) => getEvents(c.id)));
      const allEvents = perClub.flat();
      setEvents(allEvents);

      setPayments(await getMyPayments());

      // "Vinhos provados" = vinhos em que você de fato enviou uma avaliação,
      // não todos os vinhos de todos os eventos.
      const completed = allEvents.filter((e) => e.status === 'completed');
      const mine = await Promise.all(completed.map((e) => getMyRatings(e.id)));
      const ids = new Set<string>();
      completed.forEach((evt, i) => {
        for (const r of mine[i]) {
          const wine = (evt.wines || [])[r.wine_index];
          if (wine) ids.add(wine.id);
        }
      });
      setTastedWineIds(ids);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => { load(); }, [load]);

  const completed = useMemo(
    () => events.filter((e) => e.status === 'completed'), [events],
  );

  const myTastedWines = useMemo(() => {
    const map = new Map<string, Wine & { count: number }>();
    for (const evt of completed) {
      for (const wine of evt.wines || []) {
        if (!tastedWineIds.has(wine.id)) continue;
        const found = map.get(wine.id);
        if (found) found.count++;
        else map.set(wine.id, { ...wine, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [completed, tastedWineIds]);

  const pendingCount = payments.filter(
    (p) => p.status === 'pending' && p.debtor === user?.id,
  ).length;
  const toReceive = payments.filter(
    (p) => p.status === 'paid' && p.creditor === user?.id,
  );

  const achievements = useMemo(() => [
    { icon: 'wine_bar', label: 'Primeiro gole', desc: 'Conclua 1 degustação', earned: completed.length >= 1 },
    { icon: 'emoji_events', label: 'Sommelier', desc: 'Conclua 5 degustações', earned: completed.length >= 5 },
    { icon: 'local_fire_department', label: 'Sequência', desc: 'Conclua 10 degustações', earned: completed.length >= 10 },
    { icon: 'group', label: 'Sociável', desc: 'Entre em 3 clubes', earned: clubs.length >= 3 },
    { icon: 'explore', label: 'Explorador', desc: 'Prove 20 vinhos', earned: myTastedWines.length >= 20 },
    { icon: 'star', label: 'Conhecedor', desc: 'Prove 50 vinhos', earned: myTastedWines.length >= 50 },
  ], [completed.length, clubs.length, myTastedWines.length]);

  const handleSavePix = async () => {
    setSaving(true);
    try {
      await updateProfile({ pix_key: pixKey.trim() });
      await refreshUser();
      setEditingPix(false);
      toast.success('Chave Pix salva');
    } catch (err) { toast.error(describeError(err)); }
    finally { setSaving(false); }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) { toast.error('O nome não pode ficar vazio'); return; }
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      await refreshUser();
      setEditingName(false);
      toast.success('Nome atualizado');
    } catch (err) { toast.error(describeError(err)); }
    finally { setSaving(false); }
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--md-surface-container)', borderRadius: 20,
    border: '1px solid var(--md-outline-variant)', padding: 20, marginBottom: 20,
  };

  if (!authenticated) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: 56, color: 'var(--md-outline)' }}>
          account_circle
        </span>
        <h1 className="type-title-large mt-3 mb-2" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
          Entre para ver seu perfil
        </h1>
        <p className="type-body-medium mb-6" style={{ color: 'var(--md-on-surface-variant)' }}>
          Suas degustações, conquistas e acertos de conta ficam aqui.
        </p>
        <Link to="/entrar" state={{ from: '/profile' }}
          className="btn-primary" style={{ width: '100%', height: 48, borderRadius: 'var(--shape-full)' }}>
          Entrar ou criar conta
        </Link>
      </div>
    );
  }

  const stats = [
    { label: 'Vinhos provados', value: myTastedWines.length, icon: 'wine_bar' },
    { label: 'Degustações', value: completed.length, icon: 'emoji_events' },
    { label: 'Clubes', value: clubs.length, icon: 'group' },
    { label: 'Eventos', value: events.length, icon: 'event' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ textAlign: 'center', paddingTop: 24, marginBottom: 24 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', border: '3px solid var(--md-outline-variant)',
        }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
            {(user?.display_name || user?.email || '?')[0].toUpperCase()}
          </span>
        </div>

        {editingName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              aria-label="Seu nome" data-testid="name-input"
              style={{
                fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700,
                color: 'var(--md-on-surface)', textAlign: 'center',
                background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)',
                borderRadius: 12, padding: '6px 12px', outline: 'none', width: 200,
              }} />
            <button onClick={handleSaveName} disabled={saving} className="btn-primary"
              style={{ borderRadius: 8, padding: '6px 12px', fontSize: 13 }}>
              {saving ? '...' : 'Salvar'}
            </button>
            <button onClick={() => { setEditingName(false); setDisplayName(user?.display_name || ''); }}
              className="btn-text" style={{ fontSize: 13 }}>Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setEditingName(true)} data-testid="edit-name"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 700,
              color: 'var(--md-on-surface)', marginBottom: 4,
            }}>
            {user?.display_name || 'Defina seu nome'}
            <span className="material-symbols-rounded" aria-hidden="true" style={{
              fontSize: 16, marginLeft: 6, color: 'var(--md-on-surface-variant)', verticalAlign: 'middle',
            }}>edit</span>
          </button>
        )}

        <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>{user?.email}</p>
      </div>

      {/* Pendências financeiras — o que exige ação */}
      {(pendingCount > 0 || toReceive.length > 0) && (
        <div style={{
          background: 'rgba(176,101,26,0.10)', borderRadius: 16,
          border: '1px solid rgba(176,101,26,0.3)', padding: '14px 18px', marginBottom: 20,
        }} data-testid="pending-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#B0651A' }}>payments</span>
            <div style={{ flex: 1 }}>
              {pendingCount > 0 && (
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>
                  {pendingCount} {pendingCount > 1 ? 'pagamentos pendentes' : 'pagamento pendente'}
                </p>
              )}
              {toReceive.length > 0 && (
                <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
                  {toReceive.length} {toReceive.length > 1 ? 'aguardam' : 'aguarda'} sua confirmação
                  {' · '}{formatBRL(toReceive.reduce((s, p) => s + p.amount, 0))}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chave Pix */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className="pix-badge">PIX</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>Sua chave Pix</span>
        </div>
        {editingPix ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              aria-label="Sua chave Pix" data-testid="pix-input"
              style={{
                flex: 1, height: 44, padding: '0 14px', borderRadius: 12,
                background: 'var(--md-surface)', border: '1px solid var(--md-outline-variant)',
                color: 'var(--md-on-surface)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }} />
            <button onClick={handleSavePix} disabled={saving} data-testid="save-pix"
              style={{
                background: '#1F8A7C', color: 'white', border: 'none', borderRadius: 12,
                padding: '0 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              }}>{saving ? '...' : 'Salvar'}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span data-testid="pix-value" style={{
              flex: 1, fontSize: 14,
              color: user?.pix_key ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
            }}>
              {user?.pix_key || 'Sem chave — adicione para o pessoal conseguir te pagar'}
            </span>
            <button onClick={() => setEditingPix(true)} data-testid="edit-pix"
              style={{
                background: 'var(--md-surface-container-high)', color: 'var(--md-on-surface)',
                border: 'none', borderRadius: 12, padding: '8px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>{user?.pix_key ? 'Editar' : 'Adicionar'}</button>
          </div>
        )}
      </div>

      {/* Abas */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'var(--md-surface-container)', borderRadius: 16, padding: 4,
      }}>
        {(['stats', 'history', 'wines'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
              background: activeTab === tab ? 'var(--md-primary)' : 'transparent',
              color: activeTab === tab ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {tab === 'stats' ? 'Resumo' : tab === 'history' ? 'Histórico' : 'Vinhos'}
          </button>
        ))}
      </div>

      {loading && (
        <p className="type-body-small text-center" style={{ color: 'var(--md-on-surface-variant)' }}>
          Carregando...
        </p>
      )}

      {activeTab === 'stats' && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {stats.map((stat) => (
              <div key={stat.label} data-testid={`stat-${stat.icon}`} style={{
                padding: '20px 16px', textAlign: 'center',
                background: 'var(--md-surface-container)', borderRadius: 16,
                border: '1px solid var(--md-outline-variant)',
              }}>
                <span className="material-symbols-rounded ms-filled" aria-hidden="true"
                  style={{ fontSize: 24, color: 'var(--md-primary)', display: 'block', marginBottom: 8 }}>
                  {stat.icon}
                </span>
                <p style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700,
                  color: 'var(--md-on-surface)', lineHeight: 1, marginBottom: 4,
                }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)',
              marginBottom: 16, fontFamily: 'Playfair Display, serif',
            }}>Conquistas</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {achievements.map((a) => (
                <div key={a.label} style={{
                  textAlign: 'center', padding: '12px 4px', borderRadius: 14,
                  background: a.earned ? 'var(--md-primary-container)' : 'var(--md-surface-container-high)',
                  opacity: a.earned ? 1 : 0.5,
                  border: a.earned ? '1px solid var(--md-primary)' : '1px solid transparent',
                }}>
                  <span className="material-symbols-rounded ms-filled" aria-hidden="true" style={{
                    fontSize: 28, display: 'block', marginBottom: 4,
                    color: a.earned ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                  }}>{a.icon}</span>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-on-surface)' }}>{a.label}</p>
                  <p style={{ fontSize: 9, color: 'var(--md-on-surface-variant)' }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && !loading && (
        <div style={cardStyle}>
          <h2 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)',
            marginBottom: 16, fontFamily: 'Playfair Display, serif',
          }}>Histórico de degustações</h2>
          {completed.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', textAlign: 'center', padding: 20 }}>
              Nenhuma degustação concluída ainda.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completed
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((event) => {
                  const club = clubs.find((c) => c.id === event.club);
                  return (
                    // Rota correta: /events/:id (antes apontava para /event/:clubId/:id)
                    <Link key={event.id} to={`/events/${event.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 14, textDecoration: 'none',
                      background: 'var(--md-surface-container-high)',
                      border: '1px solid var(--md-outline-variant)',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, var(--md-primary), var(--md-tertiary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: '#fff' }}>
                          {event.type === 'blind' ? 'visibility_off' : 'wine_bar'}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{event.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>
                          {club?.name || 'Clube'} · {formatEventDate(event.date)}
                          {' · '}{(event.wines || []).length} vinhos
                        </p>
                      </div>
                      <span className="material-symbols-rounded" aria-hidden="true"
                        style={{ fontSize: 18, color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'wines' && !loading && (
        <div style={cardStyle}>
          <h2 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)',
            marginBottom: 16, fontFamily: 'Playfair Display, serif',
          }}>Vinhos que você provou</h2>
          {myTastedWines.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', textAlign: 'center', padding: 20 }}>
              Nenhum vinho ainda. Participe de uma degustação e envie seu ranking.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myTastedWines.slice(0, 20).map((wine) => (
                <div key={wine.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 14,
                  background: 'var(--md-surface-container-high)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: wine.type === 'white' ? '#E7C08E'
                      : wine.type === 'rosé' ? '#F4A0A8'
                      : wine.type === 'sparkling' ? '#D4AB5C' : 'var(--md-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-rounded ms-filled" style={{ fontSize: 18, color: '#fff' }}>
                      wine_bar
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--md-on-surface)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{wine.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>
                      {[wine.producer, wine.region, wine.year].filter(Boolean).join(' · ') || 'Origem não informada'}
                    </p>
                  </div>
                  {wine.count > 1 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 8,
                      background: 'var(--md-surface-container)', fontSize: 11,
                      fontWeight: 600, color: 'var(--md-on-surface-variant)',
                    }}>×{wine.count}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{
        background: 'var(--md-surface-container)', borderRadius: 20,
        border: '1px solid var(--md-outline-variant)', overflow: 'hidden', marginBottom: 24,
      }}>
        {[
          { to: '/clubs', label: 'Meus clubes', icon: 'group', count: clubs.length },
        ].map((item, i) => (
          <Link key={item.to} to={item.to} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', minHeight: 56, textDecoration: 'none',
            borderTop: i > 0 ? '1px solid var(--md-outline-variant)' : 'none',
          }}>
            <span className="material-symbols-rounded" aria-hidden="true"
              style={{ fontSize: 22, color: 'var(--md-on-surface-variant)', flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--md-on-surface)' }}>{item.label}</span>
            {item.count !== undefined && (
              <span style={{
                padding: '4px 10px', borderRadius: 12, background: 'var(--md-surface-container-high)',
                fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)',
              }}>{item.count}</span>
            )}
          </Link>
        ))}
        {/* Some sozinho quando o app já está instalado */}
        <div style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
          <InstalarApp variante="linha" />
        </div>
      </div>

      <button onClick={logout} data-testid="logout" style={{
        width: '100%', padding: '14px 0', borderRadius: 'var(--shape-full)',
        background: 'none', border: '1px solid var(--md-error)',
        color: 'var(--md-error)', fontSize: 15, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Sair da conta</button>

      <div style={{ textAlign: 'center', paddingTop: 32 }}>
        <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>Wine Circle v2.0</p>
      </div>
    </div>
  );
};
