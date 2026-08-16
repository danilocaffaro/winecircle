import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { describeError } from '../services/pocketbase';

/**
 * Entrar / criar conta numa folha modal.
 *
 * O formulário saiu do fluxo da página para não empurrar o carrossel para
 * fora da tela: no celular ele sobe de baixo, no desktop aparece centrado.
 * Em ambos os casos a apresentação continua visível atrás.
 */

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: 48,
  padding: '0 16px', borderRadius: 12,
  background: 'var(--md-surface)', border: '1px solid var(--md-outline-variant)',
  color: 'var(--md-on-surface)', fontSize: 16, fontFamily: 'inherit', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--md-on-surface-variant)',
  marginBottom: 6, display: 'block',
};

interface Props {
  modo: 'login' | 'register' | null;
  onTrocarModo: (m: 'login' | 'register') => void;
  onFechar: () => void;
  /** Para onde ir depois de entrar. */
  destino: string;
}

export const AuthSheet: React.FC<Props> = ({ modo, onTrocarModo, onFechar, destino }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const painel = useRef<HTMLDivElement>(null);
  const primeiroCampo = useRef<HTMLInputElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const aberto = modo !== null;

  // Foco entra na folha ao abrir e volta para o botão ao fechar — sem isso,
  // quem navega por teclado fica preso atrás do modal.
  //
  // Síncrono, sem timer: um setTimeout de 80ms parecia inofensivo mas roubava
  // o foco de quem já tinha começado a digitar, jogando as letras no campo
  // errado. A animação da folha não impede focar antes dela terminar.
  useLayoutEffect(() => {
    if (!aberto) return;
    focoAnterior.current = document.activeElement as HTMLElement;
    primeiroCampo.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      focoAnterior.current?.focus?.();
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onFechar(); return; }
      if (e.key !== 'Tab' || !painel.current) return;
      const focaveis = painel.current.querySelectorAll<HTMLElement>(
        'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === 'register' && !displayName.trim()) {
      toast.error('Digite seu nome — é como o pessoal vai te reconhecer');
      return;
    }
    setLoading(true);
    try {
      if (modo === 'login') {
        await login(email, password);
        toast.success('Bem-vindo de volta!');
      } else {
        await register(email, password, displayName.trim());
        toast.success('Conta criada!');
      }
      // navigate, não window.location: recarregar a página inteira descarta o
      // estado do router e cria uma corrida com quem já está navegando.
      navigate(destino, { replace: true });
    } catch (err) {
      toast.error(describeError(err));
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-scrim"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
      role="presentation"
    >
      <div
        ref={painel}
        className="auth-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-titulo"
        data-testid="auth-sheet"
      >
        {/* Puxador — sinaliza que dá para arrastar/fechar no celular */}
        <div className="auth-grabber" aria-hidden="true" />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <h2 id="auth-titulo" style={{
            fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700,
            color: 'var(--md-on-surface)', flex: 1,
          }}>
            {modo === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            data-testid="auth-close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: 'var(--md-on-surface-variant)', lineHeight: 0,
            }}>
            <span className="material-symbols-rounded" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'var(--md-surface-container-high)',
          borderRadius: 'var(--shape-full)', padding: 4,
        }}>
          {(['login', 'register'] as const).map((m) => (
            <button key={m} type="button" onClick={() => onTrocarModo(m)}
              data-testid={`tab-${m}`} aria-pressed={modo === m}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 'var(--shape-full)',
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit',
                background: modo === m ? 'var(--md-primary)' : 'transparent',
                color: modo === m ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
                transition: 'all 0.2s ease',
              }}>
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {modo === 'register' && (
            <div>
              <label htmlFor="name" style={labelStyle}>Seu nome</label>
              <input ref={primeiroCampo} id="name" data-testid="name" type="text"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como os amigos te chamam" required
                autoComplete="name" style={inputStyle} />
            </div>
          )}

          <div>
            <label htmlFor="email" style={labelStyle}>E-mail</label>
            <input ref={modo === 'login' ? primeiroCampo : undefined}
              id="email" data-testid="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com" required
              autoComplete="email" style={inputStyle} />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Senha</label>
            <input id="password" data-testid="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ao menos 8 caracteres" required minLength={8}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              style={inputStyle} />
          </div>

          <button type="submit" disabled={loading} data-testid="submit"
            style={{
              width: '100%', height: 52, borderRadius: 'var(--shape-full)',
              border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: 'var(--md-primary)', color: 'var(--md-on-primary)',
              fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}>
            {loading
              ? (modo === 'login' ? 'Entrando...' : 'Criando conta...')
              : (modo === 'login' ? 'Entrar' : 'Criar conta')}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: 16, fontSize: 12,
          color: 'var(--md-on-surface-variant)',
        }}>
          Grátis. Sem anúncio, sem cartão.
        </p>
      </div>
    </div>
  );
};
