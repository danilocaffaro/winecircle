import React, { useState, useEffect, useMemo } from 'react';
import { navegadorIOS, versaoIOS } from '../hooks/useInstalarApp';
import { configurarGuia } from '../utils/guiaInstalacao';

/**
 * Guia animado de instalação no iOS.
 *
 * Substitui a lista de passos por uma simulação do gesto: a barra do navegador
 * com o botão certo destacado, a folha de compartilhamento subindo, a linha
 * "Adicionar à Tela de Início" acesa e o ícone caindo na tela de início.
 *
 * A referência do mercado (a biblioteca add-to-homescreen) documenta que a
 * seta pulsante "afeta drasticamente as taxas de instalação" — instrução
 * escrita não compete com ver o gesto.
 *
 * Duas armadilhas que a animação precisa acertar:
 *
 * 1. O botão fica em lugar diferente em cada navegador — barra de baixo no
 *    Safari, topo no Chrome, menu no Edge. Apontar para o lado errado é pior
 *    que não apontar.
 * 2. No Safari do iOS 26, cujo layout padrão é o Compact, o ícone de
 *    compartilhar não aparece: vive atrás de um "⋯" no canto inferior
 *    esquerdo. E o layout é escolha do usuário, indetectável por JavaScript —
 *    então a instrução cobre os dois casos.
 */

type Passo = 0 | 1 | 2;

// ── Peças desenhadas ──

const IconeCompartilhar = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15V3" /><path d="m8 7 4-4 4 4" />
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
  </svg>
);

const MarcaApp = ({ tamanho = 34 }: { tamanho?: number }) => (
  <svg viewBox="0 0 512 512" width={tamanho} height={tamanho} aria-hidden="true"
    style={{ borderRadius: tamanho * 0.26, display: 'block' }}>
    <defs>
      <linearGradient id="gi" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7D2935" /><stop offset="100%" stopColor="#6B1F2A" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#gi)" />
    <circle cx="256" cy="256" r="176" fill="none" stroke="#D9AE63" strokeWidth="14" opacity=".55" />
    <g stroke="#FDF3EC" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M170 150 h172 a8 8 0 0 1 8 8 v26 a94 94 0 0 1 -188 0 v-26 a8 8 0 0 1 8 -8 z" />
      <path d="M256 278 v76" /><path d="M198 362 h116" />
    </g>
    <path d="M172 208 h168 a86 86 0 0 1 -168 0 z" fill="#D9AE63" />
  </svg>
);

/** Uma linha da folha de compartilhamento. */
const Linha: React.FC<{ rotulo: string; icone: string; aceso?: boolean }> = ({
  rotulo, icone, aceso,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
    borderRadius: 9,
    background: aceso ? 'var(--md-primary-container)' : 'transparent',
    outline: aceso ? '2px solid var(--md-primary)' : 'none',
    transition: 'background .25s ease, outline-color .25s ease',
  }}>
    <span className="material-symbols-rounded" aria-hidden="true" style={{
      fontSize: 15,
      color: aceso ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)',
    }}>{icone}</span>
    <span style={{
      fontSize: 9.5, flex: 1,
      color: aceso ? 'var(--md-on-primary-container)' : 'var(--md-on-surface)',
      fontWeight: aceso ? 600 : 400,
    }}>{rotulo}</span>
  </div>
);

// ── O guia ──

export const GuiaInstalacao: React.FC = () => {
  const nav = navegadorIOS();
  const cfg = useMemo(() => configurarGuia(nav, versaoIOS()), [nav]);

  const semMovimento = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [passo, setPasso] = useState<Passo>(0);

  // Ciclo lento o bastante para acompanhar sem pausar. Quem pediu menos
  // movimento vê os três momentos de uma vez, sem loop.
  useEffect(() => {
    if (semMovimento) return;
    const t = setTimeout(() => setPasso((p) => ((p + 1) % 3) as Passo), passo === 0 ? 2600 : 2200);
    return () => clearTimeout(t);
  }, [passo, semMovimento]);

  const naBarraDeBaixo = cfg.barra === 'baixo';
  const justificar = cfg.alinhamento === 'esquerda' ? 'flex-start'
    : cfg.alinhamento === 'direita' ? 'flex-end' : 'center';

  const barra = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: justificar,
      gap: 16, padding: '7px 12px',
      background: 'var(--md-surface-container-high)',
      borderTop: naBarraDeBaixo ? '1px solid var(--md-outline-variant)' : 'none',
      borderBottom: naBarraDeBaixo ? 'none' : '1px solid var(--md-outline-variant)',
      position: 'relative',
    }}>
      {/* No topo (Chrome) a barra carrega o endereço */}
      {!naBarraDeBaixo && (
        <span style={{
          flex: 1, height: 16, borderRadius: 8, background: 'var(--md-surface)',
          border: '1px solid var(--md-outline-variant)',
        }} />
      )}

      <span style={{
        position: 'relative', width: 24, height: 24, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: passo === 0 ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)',
        background: passo === 0 ? 'var(--md-primary)' : 'transparent',
        transition: 'background .3s ease, color .3s ease',
      }}>
        {cfg.simbolo === 'compartilhar'
          ? <IconeCompartilhar />
          : <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>⋯</span>}

        {/* Pulso no alvo — é o que a referência aponta como decisivo */}
        {passo === 0 && !semMovimento && (
          <span aria-hidden="true" className="pulso-alvo" />
        )}
      </span>

      {naBarraDeBaixo && (
        <>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--md-outline-variant)' }} />
          <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--md-outline-variant)' }} />
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* Palco */}
      <div style={{
        width: 190, height: 232, margin: '0 auto',
        borderRadius: 22, padding: 6,
        background: 'linear-gradient(160deg, #2A1D1E 0%, #3C2A2B 100%)',
        boxShadow: '0 14px 30px -12px rgba(60,12,17,0.4)',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 17, overflow: 'hidden',
          background: 'var(--md-surface)', display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}>
          {passo < 2 && !naBarraDeBaixo && barra}

          {/* Conteúdo: a página, ou a tela de início no último passo */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {passo < 2 ? (
              <div style={{ padding: 10, display: 'grid', gap: 6 }}>
                <MarcaApp tamanho={22} />
                <span style={{
                  fontFamily: 'Playfair Display, serif', fontSize: 12, fontWeight: 700,
                  color: 'var(--md-on-surface)',
                }}>Wine Circle</span>
                <span style={{ height: 5, width: '80%', borderRadius: 3, background: 'var(--md-outline-variant)' }} />
                <span style={{ height: 5, width: '55%', borderRadius: 3, background: 'var(--md-outline-variant)' }} />
              </div>
            ) : (
              // Tela de início: o ícone chega
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, #E9DCDC 0%, #D6C3C4 100%)',
                padding: 12, display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)', gap: 9, alignContent: 'start',
              }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    aspectRatio: '1', borderRadius: 9, background: 'rgba(255,255,255,0.45)',
                  }} />
                ))}
                <span className={semMovimento ? undefined : 'icone-chega'}
                  style={{ display: 'block' }}>
                  <MarcaApp tamanho={30} />
                </span>
              </div>
            )}

            {/* Folha de compartilhamento */}
            {passo === 1 && (
              <div className={semMovimento ? undefined : 'folha-sobe'} style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                background: 'var(--md-surface-container-low)',
                borderRadius: '14px 14px 0 0', padding: '8px 8px 10px',
                boxShadow: '0 -6px 18px rgba(60,12,17,0.16)',
                display: 'grid', gap: 2,
              }}>
                <span style={{
                  width: 28, height: 3, borderRadius: 2, margin: '0 auto 6px',
                  background: 'var(--md-outline-variant)',
                }} />
                <Linha icone="bookmark" rotulo="Adicionar aos Favoritos" />
                <Linha icone="add_box" rotulo="Adicionar à Tela de Início" aceso />
                <Linha icone="content_copy" rotulo="Copiar" />
              </div>
            )}
          </div>

          {passo < 2 && naBarraDeBaixo && barra}
        </div>
      </div>

      {/* Legenda do momento — região viva, para leitor de tela acompanhar */}
      <p aria-live="polite" style={{
        marginTop: 14, textAlign: 'center', fontSize: 13.5, lineHeight: 1.5,
        color: 'var(--md-on-surface)', minHeight: 44,
      }}>
        <strong style={{ color: 'var(--md-primary)' }}>{passo + 1}.</strong>{' '}
        {cfg.legendas[passo]}
      </p>

      {/* Trilha dos três momentos, tocável */}
      <div role="tablist" aria-label="Passos da instalação"
        style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 4 }}>
        {[0, 1, 2].map((i) => (
          <button key={i} role="tab" aria-selected={i === passo}
            aria-label={`Passo ${i + 1}: ${cfg.legendas[i]}`}
            data-testid={`guia-passo-${i}`}
            onClick={() => setPasso(i as Passo)}
            style={{
              height: 5, width: i === passo ? 22 : 5, borderRadius: 3,
              border: 'none', padding: 0, cursor: 'pointer',
              background: i === passo ? 'var(--md-primary)' : 'var(--md-outline-variant)',
              transition: semMovimento ? 'none' : 'width .3s ease, background .3s ease',
            }} />
        ))}
      </div>
    </div>
  );
};
