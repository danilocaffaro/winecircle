import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getClubs, getEvents } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, getMyPayments } from '../services/pocketbase';

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

  // Load pending payments count
  React.useEffect(() => {
    if (!authenticated) return;
    getMyPayments('pending').then(p => setPendingCount(p.length)).catch(() => {});
  }, [authenticated]);

  const handleSavePix = async () => {
    if (!authenticated) return;
    setSaving(true);
    try {
      await updateProfile({ pix_key: pixKey });
      await refreshUser();
      setEditingPix(false);
      toast.success('Pix key saved!');
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
      toast.success('Name updated!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const stats = [
    { label: 'Wines Tasted', value: totalWines, icon: 'wine_bar' },
    { label: 'Tastings', value: completed.length, icon: 'emoji_events' },
    { label: 'Clubs', value: clubs.length, icon: 'group' },
    { label: 'Events', value: events.length, icon: 'event' },
  ];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
      {/* Profile header */}
      <div style={{ textAlign: 'center', paddingTop: 24, marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-tertiary) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          border: '2px solid var(--md-outline-variant)',
        }}>
          {authenticated ? (
            <span style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
              {(user?.display_name || user?.email || '?')[0].toUpperCase()}
            </span>
          ) : (
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 36, color: '#fff' }}>person</span>
          )}
        </div>

        {/* Name */}
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
              fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700,
              color: 'var(--md-on-surface)', marginBottom: 4, cursor: 'pointer',
            }}>
              {user?.display_name || 'Set your name'}
              <span className="material-symbols-rounded" style={{ fontSize: 16, marginLeft: 6, color: 'var(--md-on-surface-variant)', verticalAlign: 'middle' }}>edit</span>
            </h1>
          )
        ) : (
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: 'var(--md-on-surface)', marginBottom: 4 }}>
            Guest
          </h1>
        )}

        <p style={{ fontSize: 13, color: 'var(--md-on-surface-variant)' }}>
          {authenticated ? user?.email : 'Not signed in'}
        </p>
      </div>

      {/* Pix Key (authenticated only) */}
      {authenticated && (
        <div style={{
          background: 'var(--md-surface-container)', borderRadius: 20,
          border: '1px solid var(--md-outline-variant)', padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="pix-badge">PIX</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--md-on-surface)' }}>Your Pix Key</span>
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

      {/* Pending payments alert */}
      {authenticated && pendingCount > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.1)', borderRadius: 16,
          border: '1px solid rgba(245,158,11,0.3)', padding: '14px 18px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#F59E0B' }}>payments</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>
              {pendingCount} pending payment{pendingCount > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)' }}>Check your expenses to settle up</p>
          </div>
        </div>
      )}

      {/* Stats */}
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

      {/* Quick links */}
      <div style={{ background: 'var(--md-surface-container)', borderRadius: 20, border: '1px solid var(--md-outline-variant)', overflow: 'hidden', marginBottom: 24 }}>
        {[
          { to: '/clubs', label: 'My Clubs', icon: 'group', count: clubs.length },
          { to: '/search', label: 'Discover Wines', icon: 'search' },
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

      {/* App info */}
      <div style={{ textAlign: 'center', paddingTop: 32 }}>
        <p style={{ fontSize: 11, color: 'var(--md-on-surface-variant)' }}>Wine Circle v1.1</p>
        <p style={{ fontSize: 10, color: 'var(--md-on-surface-variant)', opacity: 0.6 }}>Taste, rank, celebrate together</p>
      </div>
    </div>
  );
};
