import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FeatureCarousel } from '../components/FeatureCarousel';
import { AuthSheet } from '../components/AuthSheet';
import { InstalarApp } from '../components/InstalarApp';

/**
 * Porta de entrada do app.
 *
 * Antes era um muro de login: quem chegava pela primeira vez via um formulário
 * e nada mais, sem nenhuma pista do que o produto faz. Agora a tela é a
 * apresentação — um carrossel com uma tela de exemplo por funcionalidade — e
 * entrar fica a um toque, no cabeçalho e numa barra fixa no rodapé.
 */
export const AuthPage: React.FC = () => {
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from || '/';
  const [modo, setModo] = useState<'login' | 'register' | null>(null);

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--md-background)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cabeçalho */}
      <header className="entry-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 34, height: 34, borderRadius: 11, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--md-primary), var(--md-tertiary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 19, color: '#fff' }}>
              wine_bar
            </span>
          </span>
          <span style={{
            fontFamily: 'Playfair Display, serif', fontSize: 19, fontWeight: 700,
            color: 'var(--md-on-surface)',
          }}>Wine Circle</span>
        </div>

        <div className="entry-header-actions">
          <button type="button" onClick={() => setModo('login')} data-testid="header-login"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
              color: 'var(--md-on-surface)', padding: '10px 14px',
            }}>Entrar</button>
          <button type="button" onClick={() => setModo('register')} data-testid="header-register"
            style={{
              background: 'var(--md-primary)', color: 'var(--md-on-primary)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 600, padding: '11px 20px',
              borderRadius: 'var(--shape-full)',
            }}>Criar conta</button>
        </div>
      </header>

      {/* Apresentação */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px 0',
      }}>
        <h1 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 'clamp(26px, 7vw, 36px)',
          fontWeight: 700, color: 'var(--md-on-surface)', lineHeight: 1.1,
          textAlign: 'center', textWrap: 'balance', marginBottom: 8,
        }}>
          Prove o vinho,{' '}
          <span style={{ color: 'var(--md-primary)' }}>não o rótulo.</span>
        </h1>
        <p style={{
          color: 'var(--md-on-surface-variant)', fontSize: 15, textAlign: 'center',
          maxWidth: 340, lineHeight: 1.5, marginBottom: 28,
        }}>
          Degustações às cegas com os amigos, do convite ao acerto da conta.
        </p>

        <FeatureCarousel />
      </main>

      {/* Barra fixa — no celular, entrar nunca sai da tela */}
      <div className="entry-dock">
        <InstalarApp />
        <div className="entry-dock-botoes">
        <button type="button" onClick={() => setModo('login')} data-testid="dock-login"
          style={{
            flex: 1, height: 50, borderRadius: 'var(--shape-full)',
            background: 'var(--md-surface-container-high)', color: 'var(--md-on-surface)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 600,
          }}>Entrar</button>
        <button type="button" onClick={() => setModo('register')} data-testid="dock-register"
          style={{
            flex: 1.4, height: 50, borderRadius: 'var(--shape-full)',
            background: 'var(--md-primary)', color: 'var(--md-on-primary)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 600,
          }}>Criar conta</button>
        </div>
      </div>

      <AuthSheet modo={modo} onTrocarModo={setModo}
        onFechar={() => setModo(null)} destino={destino} />
    </div>
  );
};
