import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        if (!displayName.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        await register(email, password, displayName);
        toast.success('Account created!');
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Something went wrong';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--md-background)', padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
          background: 'linear-gradient(135deg, var(--md-primary), var(--md-tertiary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>W</span>
        </div>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700,
          color: 'var(--md-on-surface)',
        }}>Wine Circle</h1>
        <p style={{ color: 'var(--md-on-surface-variant)', fontSize: 14, marginTop: 4 }}>
          Taste together, discover more
        </p>
      </div>

      {/* Form card */}
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--md-surface-container)',
        borderRadius: 24, padding: '32px 24px',
        border: '1px solid var(--md-outline-variant)',
      }}>
        {/* Toggle */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: 'var(--md-surface-container-high)',
          borderRadius: 'var(--shape-full)', padding: 4,
        }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '10px 0', borderRadius: 'var(--shape-full)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              fontFamily: 'inherit',
              background: mode === m ? 'var(--md-primary)' : 'transparent',
              color: mode === m ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
              transition: 'all 0.2s ease',
            }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', marginBottom: 6, display: 'block' }}>
                Your Name
              </label>
              <input
                type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="How your friends know you"
                required
                style={{
                  width: '100%', boxSizing: 'border-box', height: 48,
                  padding: '0 16px', borderRadius: 12,
                  background: 'var(--md-surface)', border: '1px solid var(--md-outline-variant)',
                  color: 'var(--md-on-surface)', fontSize: 15, fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', marginBottom: 6, display: 'block' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required autoComplete="email"
              style={{
                width: '100%', boxSizing: 'border-box', height: 48,
                padding: '0 16px', borderRadius: 12,
                background: 'var(--md-surface)', border: '1px solid var(--md-outline-variant)',
                color: 'var(--md-on-surface)', fontSize: 15, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)', marginBottom: 6, display: 'block' }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{
                width: '100%', boxSizing: 'border-box', height: 48,
                padding: '0 16px', borderRadius: 12,
                background: 'var(--md-surface)', border: '1px solid var(--md-outline-variant)',
                color: 'var(--md-on-surface)', fontSize: 15, fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', height: 52, borderRadius: 'var(--shape-full)',
            border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: 'var(--md-primary)', color: 'var(--md-on-primary)',
            fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
            marginTop: 8,
          }}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="animate-spin" style={{
                  width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                }} />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>
      </div>

      {/* Skip for now */}
      <button
        onClick={() => {
          // Allow browsing without auth (read-only mode)
          window.dispatchEvent(new CustomEvent('wc-skip-auth'));
        }}
        style={{
          marginTop: 24, background: 'none', border: 'none',
          color: 'var(--md-on-surface-variant)', fontSize: 14,
          cursor: 'pointer', fontFamily: 'inherit',
          textDecoration: 'underline', textUnderlineOffset: 3,
        }}
      >
        Browse without account
      </button>
    </div>
  );
};
