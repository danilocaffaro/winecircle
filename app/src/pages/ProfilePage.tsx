import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getClubs, getEvents } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, getMyPayments } from '../services/pocketbase';
import type { Wine } from '../types';

export const ProfilePage: React.FC = () => {
  const { authenticated, user, logout, refreshUser } = useAuth();
  const clubs = getClubs();
  const events = getEvents();
  const completed = events.filter(e => e.status === 'completed');
  const totalWines = completed.reduce((sum, e) => sum + e.wines.length, 0);

  const [editingPix, setEditingPix] = useState(false);
  const [pixKey, setPixKey] = useState(user?.pix_key || '');
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'wines'>('stats');

  React.useEffect(() => {
    if (!authenticated) return;
    getMyPayments('pending').then(p => setPendingCount(p.length)).catch(() => {});
  }, [authenticated]);

  // Compute achievements
  const achievements = useMemo(() => {
    const badges: { icon: string; label: string; desc: string; earned: boolean }[] = [
      { icon: 'wine_bar', label: 'Primeiro Gole', desc: 'Complete sua primeira degustação', earned: completed.length >= 1 },
      { icon: 'emoji_events', label: 'Sommelier', desc: 'Complete 5 degustações', earned: completed.length >= 5 },
      { icon: 'local_fire_department', label: 'Sequência', desc: 'Complete 10 degustações', earned: completed.length >= 10 },
      { icon: 'group', label: 'Sociável', desc: 'Entre em 3 clubes', earned: clubs.length >= 3 },
      { icon: 'explore', label: 'Explorador', desc: 'Prove 20 vinhos diferentes', earned: totalWines >= 20 },
      { icon: 'star', label: 'Conhecedor', desc: 'Prove 50 vinhos', earned: totalWines >= 50 },
    ];
    return badges;
  }, [completed.length, clubs.length, totalWines]);

  // Unique wines across all events
  const allWines = useMemo(() => {
    const wineMap = new Map<string, Wine & { tastedCount: number }>();
    completed.forEach(e => {
      e.wines.forEach(w => {
        const existing = wineMap.get(w.id);
        if (existing) existing.tastedCount++;
        else wineMap.set(w.id, { ...w, tastedCount: 1 });
      });
    });
    return Array.from(wineMap.values()).sort((a, b) => b.tastedCount - a.tastedCount);
  }, [completed]);

  const handleSavePix = async () => {
    if (!authenticated) return;
    setSaving(true);
    try {
      await updateProfile({ pix_key: pixKey });
      await refreshUser();
      setEditingPix(false);
      toast.success('Chave Pix salva!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleSaveName = async () => {
    if (!authenticated || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      await refreshUser();
      setEditingName(false);
      toast.success('Nome atualizado!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const stats = [
    { label: 'Vinhos Provados', value: totalWines, icon: 'wine_bar' },
    { label: 'Degustações', value: completed.length, icon: 'emoji_events' },
    { label: 'Clubs', value: clubs.length, icon: 'group' },
    { label: 'Events', value: events.length, icon: 'event' },
  ];

  const earnedCount = achievements.filter(a => a.earned).length;

  const cardStyle: React.CSSProperties = {
    background: 'var(--md-surface-container)', borderRadius: 20,
    border: '1px solid var(--md-outline-variant)', padding: 20, marginBottom: 20,
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      {/* Profile header */}
      <div style={{ textAlign: 'center', paddingTop: 24, marginBottom: 24 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          border: '3px solid var(--md-outline-variant)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {authenticated ? (
            <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>
              {(user?.display_name || user?.email || '?')[0].toUpperCase()}
            </span>
          ) : (
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 40, color: '#fff' }}>person</span>
          )}
        </div>

        {authenticated ? (
          editingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700,
                  color: 'var(--md-on-surface)', textAlign: 'center',
                  background: 'var(--md-surface-container)', border: '1px solid var(--md-outline-variant)',
                  borderRadius: 12, padding: '6px 12px', outline: 'none', width: 200,
                }} />
              <button onClick={handleSaveName} disabled={saving} style={{
                background: 'var(--md-primary)', color: 'var(--md-on-primary)',
                border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>{saving ? '...' : 'Save'}</button>
              <button onClick={() => setEditingName(false)} style={{
                background: 'none', border: 'none', color: 'var(--md-on-surface-variant)',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          ) : (
            <h1 onClick={() => setEditingName(true)} style={{
              fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 700,
              color: 'var(--md-on-surface)', marginBottom: 4, cursor: 'pointer',
            }}>
              {user?.display_name || 'Defina seu nome'}
              <span className="material-symbols-rounded" style={{ fontSize: 16, marginLeft: 6, color: 'var(--md-on-surface-variant)', verticalAlign: 'middle' }}>edit</span>
            </h1>
          )
        ) : (
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 4 }}>
            Visitante
          </h1>
        )}

        <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)', marginBottom: 8 }}>
          {authenticated ? user?.email : 'Não conectado'}
        </p>

        {/* Member since + achievement summary */}
        {authenticated && (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, color: 'var(--md-on-surface-variant)' }}>
            <span>🏅 {earnedCount}/{achievements.length} badges</span>
            <span>🍷 {totalWines} wines</span>
          </div>
        )}
      </div>

      {/* Pix Key */}
      {authenticated && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="pix-badge">PIX</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>Sua Chave Pix</span>
          </div>
          {editingPix ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={pixKey} onChange={e => setPixKey(e.target.value)}
                placeholder="CPF, email, phone, or random key"
                style={{
                  flex: 1, height: 44, padding: '0 14px', borderRadius: 12,
                  background: 'var(--md-surface)', border: '1px solid var(--md-outline-variant)',
                  color: 'var(--md-on-surface)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                }} />
              <button onClick={handleSavePix} disabled={saving} style={{
                background: '#32BCAD', color: 'white', border: 'none', borderRadius: 12,
                padding: '0 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              }}>{saving ? '...' : 'Save'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 14, color: user?.pix_key ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)' }}>
                {user?.pix_key || 'Not set — add your key so friends can pay you'}
              </span>
              <button onClick={() => setEditingPix(true)} style={{
                background: 'var(--md-surface-container-high)', color: 'var(--md-on-surface)',
                border: 'none', borderRadius: 12, padding: '8px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>
                {user?.pix_key ? 'Edit' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending payments */}
      {authenticated && pendingCount > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', borderRadius: 16,
          border: '1px solid rgba(245,158,11,0.3)', padding: '14px 18px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#F59E0B' }}>payments</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>
              {pendingCount} pagamento pendente{pendingCount > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>Verifique suas despesas</p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--md-surface-container)', borderRadius: 16, padding: 4 }}>
        {(['stats', 'history', 'wines'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
            background: activeTab === tab ? 'var(--md-primary)' : 'transparent',
            color: activeTab === tab ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}>
            {tab === 'stats' ? 'Resumo' : tab === 'history' ? 'Histórico' : 'Vinhos'}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {stats.map(stat => (
              <div key={stat.label} style={{
                padding: '20px 16px', textAlign: 'center',
                background: 'var(--md-surface-container)', borderRadius: 16,
                border: '1px solid var(--md-outline-variant)',
              }}>
                <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)', display: 'block', marginBottom: 8 }}>
                  {stat.icon}
                </span>
                <p style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--md-on-surface)', lineHeight: 1, marginBottom: 4 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Conquistas */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>
              🏅 Conquistas
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {achievements.map(a => (
                <div key={a.label} style={{
                  textAlign: 'center', padding: '12px 4px', borderRadius: 14,
                  background: a.earned ? 'rgba(var(--md-primary-rgb, 103,80,164), 0.08)' : 'var(--md-surface-container-high)',
                  opacity: a.earned ? 1 : 0.45,
                  border: a.earned ? '1px solid var(--md-primary)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  <span className="material-symbols-rounded ms-filled" style={{
                    fontSize: 28, display: 'block', marginBottom: 4,
                    color: a.earned ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
                  }}>{a.icon}</span>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 2 }}>{a.label}</p>
                  <p style={{ fontSize: 9, color: 'var(--md-on-surface-variant)' }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>
            📋 Histórico de Degustações
          </h3>
          {completed.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', textAlign: 'center', padding: 20 }}>
              Nenhuma degustação concluída ainda. Crie seu primeiro evento!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completed
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map(event => {
                  const club = clubs.find(c => c.id === event.clubId);
                  return (
                    <Link key={event.id} to={`/event/${event.clubId}/${event.id}`} style={{
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
                        <span style={{ fontSize: 18 }}>{event.type === 'blind' ? '🫣' : '🍷'}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.name}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>
                          {club?.name || 'Clube desconhecido'} · {new Date(event.date).toLocaleDateString('pt-BR')} · {event.wines.length} wines
                        </p>
                      </div>
                      <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Wines tab */}
      {activeTab === 'wines' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>
            🍷 Coleção de Vinhos
          </h3>
          {allWines.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', textAlign: 'center', padding: 20 }}>
              Nenhum vinho provado ainda. Participe de uma degustação!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allWines.slice(0, 15).map(wine => (
                <div key={wine.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 14,
                  background: 'var(--md-surface-container-high)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: wine.type === 'red' ? '#722F37' : wine.type === 'white' ? '#F5E6CC' : wine.type === 'rosé' ? '#FFB7C5' : wine.type === 'sparkling' ? '#FFD700' : 'var(--md-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 16 }}>🍷</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--md-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {wine.name}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>
                      {[wine.producer, wine.region, wine.year].filter(Boolean).join(' · ') || 'Origem desconhecida'}
                    </p>
                  </div>
                  {wine.tastedCount > 1 && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 8,
                      background: 'var(--md-surface-container)', fontSize: 11, fontWeight: 600,
                      color: 'var(--md-on-surface-variant)',
                    }}>×{wine.tastedCount}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, border: '1px solid var(--md-outline-variant)', overflow: 'hidden', marginBottom: 24 }}>
        {[
          { to: '/clubs', label: 'Meus Clubes', icon: 'group', count: clubs.length },
          { to: '/search', label: 'Descobrir Vinhos', icon: 'search' },
        ].map((item, i) => (
          <Link key={item.to} to={item.to} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 20px', minHeight: 56, textDecoration: 'none',
            borderTop: i > 0 ? '1px solid var(--md-outline-variant)' : 'none',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--md-on-surface-variant)', flexShrink: 0 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--md-on-surface)' }}>{item.label}</span>
            {item.count !== undefined && (
              <span style={{ padding: '4px 10px', borderRadius: 12, background: 'var(--md-surface-container-high)', fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)' }}>{item.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Auth actions */}
      {authenticated ? (
        <button onClick={logout} style={{
          width: '100%', padding: '14px 0', borderRadius: 'var(--shape-full)',
          background: 'none', border: '1px solid var(--md-error)',
          color: 'var(--md-error)', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Sign Out
        </button>
      ) : (
        <button onClick={() => { localStorage.removeItem('wc_skip_auth'); window.location.reload(); }} style={{
          width: '100%', padding: '14px 0', borderRadius: 'var(--shape-full)',
          background: 'var(--md-primary)', border: 'none',
          color: 'var(--md-on-primary)', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Sign In / Create Account
        </button>
      )}

      <div style={{ textAlign: 'center', paddingTop: 32 }}>
        <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>Wine Circle v1.2</p>
        <p style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', opacity: 0.6 }}>Deguste, classifique, celebre junto</p>
      </div>
    </div>
  );
};
