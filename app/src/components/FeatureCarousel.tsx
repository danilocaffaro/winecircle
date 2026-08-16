import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Carrossel de apresentação, com uma tela de exemplo por funcionalidade.
 *
 * As telas são desenhadas em CSS, não são capturas: pesam nada, acompanham os
 * tokens do app (se a paleta mudar, elas mudam junto) e ficam nítidas em
 * qualquer densidade de pixel.
 *
 * Substitui o muro de login que abria o app. Antes, quem chegava pela primeira
 * vez via um formulário e nada mais — nenhuma pista do que o produto faz.
 */

// ── Moldura de celular compartilhada ──

const Phone: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => (
  <div aria-hidden="true" style={{
    width: 200, height: 348, flexShrink: 0,
    borderRadius: 26, padding: 7,
    background: 'linear-gradient(160deg, #2A1D1E 0%, #3C2A2B 100%)',
    boxShadow: '0 18px 40px -12px rgba(60,12,17,0.45), 0 2px 6px rgba(0,0,0,0.14)',
  }}>
    <div style={{
      width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden',
      background: 'var(--md-surface)', display: 'flex', flexDirection: 'column',
    }}>
      {/* barra do app */}
      <div style={{
        padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid var(--md-outline-variant)',
        background: 'var(--md-surface-container-low)', flexShrink: 0,
      }}>
        <span style={{
          width: 15, height: 15, borderRadius: 5, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--md-primary), var(--md-tertiary))',
        }} />
        <span style={{
          fontFamily: 'Playfair Display, serif', fontSize: 10, fontWeight: 700,
          color: 'var(--md-on-surface)', letterSpacing: '0.01em',
        }}>{title}</span>
      </div>
      <div style={{ flex: 1, padding: 11, display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; accent?: boolean; pad?: number }> = ({
  children, accent, pad = 8,
}) => (
  <div style={{
    background: 'var(--md-surface-container)', borderRadius: 11, padding: pad,
    border: `1px solid ${accent ? 'var(--md-primary)' : 'var(--md-outline-variant)'}`,
    display: 'flex', alignItems: 'center', gap: 7,
  }}>{children}</div>
);

const Avatar: React.FC<{ letter: string; tone?: 'primary' | 'tertiary' }> = ({ letter, tone = 'primary' }) => (
  <span style={{
    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 700,
    background: tone === 'primary' ? 'var(--md-primary-container)' : 'var(--md-tertiary-container)',
    color: tone === 'primary' ? 'var(--md-on-primary-container)' : 'var(--md-on-tertiary-container)',
  }}>{letter}</span>
);

const Line: React.FC<{ w: string; h?: number; strong?: boolean }> = ({ w, h = 6, strong }) => (
  <span style={{
    display: 'block', width: w, height: h, borderRadius: h / 2,
    background: strong ? 'var(--md-on-surface)' : 'var(--md-outline-variant)',
    opacity: strong ? 0.75 : 1,
  }} />
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: 8, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--md-on-surface-variant)',
  }}>{children}</span>
);

// ── As quatro telas ──

const TelaClube = () => (
  <Phone title="Confraria da Quinta">
    <Label>Membros</Label>
    {[['C', 'Carlos'], ['M', 'Marina'], ['P', 'Pedro']].map(([l, nome], i) => (
      <Card key={l}>
        <Avatar letter={l} tone={i === 1 ? 'tertiary' : 'primary'} />
        <span style={{ fontSize: 10, color: 'var(--md-on-surface)' }}>{nome}</span>
      </Card>
    ))}
    <div style={{ marginTop: 4 }}><Label>Próxima degustação</Label></div>
    <div style={{
      background: 'var(--md-surface-container)', borderRadius: 11, padding: 8,
      border: '1px solid var(--md-outline-variant)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{
        fontFamily: 'Playfair Display, serif', fontSize: 10, fontWeight: 600,
        color: 'var(--md-on-surface)',
      }}>Tintos de setembro</span>
      <span style={{ fontSize: 8, color: 'var(--md-on-surface-variant)' }}>
        20/09 · às cegas · 4 vinhos
      </span>
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
      <span style={{
        flex: 1, background: 'var(--md-primary)', color: 'var(--md-on-primary)',
        borderRadius: 999, padding: '7px 0', textAlign: 'center',
        fontSize: 9, fontWeight: 600,
      }}>Convidar por link</span>
    </div>
  </Phone>
);

const TelaDegustacao = () => (
  <Phone title="Degustação">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Label>Quem enviou</Label>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--md-primary)' }}>2/3</span>
    </div>
    <span style={{ height: 4, borderRadius: 2, background: 'var(--md-surface-container-highest)', display: 'block' }}>
      <span style={{ display: 'block', width: '66%', height: 4, borderRadius: 2, background: 'var(--md-primary)' }} />
    </span>
    {['A', 'B', 'C', 'D'].map((letra, i) => (
      <Card key={letra} accent={i === 0}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700,
          background: 'var(--md-primary)', color: 'var(--md-on-primary)',
        }}>{i + 1}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{
            fontFamily: 'Playfair Display, serif', fontSize: 10, fontWeight: 600,
            color: 'var(--md-on-surface)',
          }}>Vinho {letra}</span>
          <Line w="60%" h={4} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--md-outline)', lineHeight: 1 }}>⠿</span>
      </Card>
    ))}
    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {['Carlos ✓', 'Marina ✓', 'Pedro'].map((n, i) => (
          <span key={n} style={{
            flex: 1, textAlign: 'center', borderRadius: 999, padding: '3px 0',
            fontSize: 7, fontWeight: 600,
            background: i < 2 ? 'var(--md-tertiary-container)' : 'var(--md-surface-container)',
            color: i < 2 ? 'var(--md-on-tertiary-container)' : 'var(--md-on-surface-variant)',
          }}>{n}</span>
        ))}
      </div>
      <span style={{
        background: 'var(--md-primary)', color: 'var(--md-on-primary)',
        borderRadius: 999, padding: '7px 0', textAlign: 'center',
        fontSize: 9, fontWeight: 600,
      }}>Enviar meu ranking</span>
    </div>
  </Phone>
);

const TelaResultado = () => (
  <Phone title="Resultado">
    <div style={{
      borderRadius: 12, padding: '13px 9px', textAlign: 'center',
      background: 'linear-gradient(135deg, var(--md-primary) 0%, var(--md-secondary) 55%, var(--md-primary) 100%)',
      color: '#fff',
    }}>
      <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', color: '#D4AB5C' }}>VENCEDOR</div>
      <div style={{
        fontFamily: 'Playfair Display, serif', fontSize: 12, fontWeight: 700, marginTop: 4,
      }}>Quinta do Crasto</div>
      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: 'Playfair Display, serif', fontSize: 19, fontWeight: 800, color: '#D4AB5C',
        }}>8</span>
        <span style={{ fontSize: 8, opacity: 0.65 }}>/ 9 pts</span>
      </div>
    </div>
    <Label>Classificação</Label>
    {[[1, '8'], [2, '7'], [3, '4']].map(([pos, pts], i) => (
      <Card key={pos} accent={i === 0}>
        <span style={{
          width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700,
          background: i === 0 ? 'var(--md-tertiary-container)' : 'var(--md-surface-container-highest)',
          color: i === 0 ? 'var(--md-on-tertiary-container)' : 'var(--md-on-surface-variant)',
        }}>{pos}</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Line w={i === 0 ? '80%' : i === 1 ? '65%' : '55%'} h={5} strong />
          <Line w="40%" h={3} />
        </div>
        <span style={{
          fontFamily: 'Playfair Display, serif', fontSize: 12, fontWeight: 700,
          color: 'var(--md-primary)',
        }}>{pts}</span>
      </Card>
    ))}
    <div style={{ marginTop: 'auto' }}>
      <Label>Voto a voto</Label>
      <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
        {['C', 'M', 'P'].map((l, i) => (
          <span key={l} style={{
            flex: 1, textAlign: 'center', borderRadius: 7, padding: '4px 0',
            fontSize: 8, fontWeight: 700,
            background: i === 2 ? 'var(--md-surface-container)' : 'var(--md-tertiary-container)',
            color: i === 2 ? 'var(--md-on-surface-variant)' : 'var(--md-on-tertiary-container)',
          }}>{l} · {i === 2 ? '2º' : '1º'}</span>
        ))}
      </div>
    </div>
  </Phone>
);

const TelaConta = () => (
  <Phone title="Divisão da conta">
    <div style={{
      borderRadius: 11, padding: 9, background: 'var(--md-surface-container)',
      border: '1px solid var(--md-outline-variant)',
    }}>
      <Label>Total da conta</Label>
      <div style={{
        fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700,
        color: 'var(--md-primary)', marginTop: 2,
      }}>R$ 300,00</div>
      <div style={{ fontSize: 8, color: 'var(--md-on-surface-variant)' }}>R$ 100,00 por pessoa · 3 participantes</div>
    </div>
    <Label>Transferências</Label>
    {[['P', 'M', 'Pendente', '#B0651A'], ['C', 'M', 'Confirmado', '#2E7D32']].map(([de, para, status, cor]) => (
      <div key={de} style={{
        background: 'var(--md-surface-container)', borderRadius: 11, padding: 8,
        border: '1px solid var(--md-outline-variant)',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Avatar letter={de} />
          <span style={{ fontSize: 10, color: 'var(--md-outline)' }}>→</span>
          <Avatar letter={para} tone="tertiary" />
          <span style={{
            marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--md-tertiary)',
          }}>R$ 100</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
            background: '#1F8A7C', color: '#fff',
          }}>PIX</span>
          <span style={{ fontSize: 7, fontWeight: 600, color: cor }}>{status}</span>
        </div>
      </div>
    ))}
  </Phone>
);

// ── Conteúdo dos slides ──

const SLIDES = [
  {
    tela: TelaClube,
    titulo: 'Chame o pessoal',
    texto: 'Crie o clube e mande um link. Quem entrar já aparece na lista, sem cadastro complicado.',
  },
  {
    tela: TelaDegustacao,
    titulo: 'Cada um no seu celular',
    texto: 'Todo mundo ordena os vinhos do próprio aparelho, sem ver o rótulo. Ninguém vê o voto de ninguém antes da hora.',
  },
  {
    tela: TelaResultado,
    titulo: 'O app apura',
    texto: 'Contagem de Borda soma os votos e revela o vencedor. Dá para ver como cada pessoa classificou.',
  },
  {
    tela: TelaConta,
    titulo: 'E divide a conta',
    texto: 'Informe quem pagou o quê. O app calcula as transferências, mostra a chave Pix e acompanha até todo mundo acertar.',
  },
];

const INTERVALO = 6000;

export const FeatureCarousel: React.FC = () => {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueX = useRef<number | null>(null);
  const regiao = useRef<HTMLDivElement>(null);

  const reduzMovimento = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const ir = useCallback((i: number) => {
    setAtual(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  // Avanço automático — para quando a pessoa interage, e nem começa se o
  // sistema pede menos movimento.
  useEffect(() => {
    if (pausado || reduzMovimento) return;
    const t = setTimeout(() => ir(atual + 1), INTERVALO);
    return () => clearTimeout(t);
  }, [atual, pausado, reduzMovimento, ir]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setPausado(true); ir(atual + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPausado(true); ir(atual - 1); }
  };

  return (
    <section
      ref={regiao}
      aria-roledescription="carrossel"
      aria-label="Como o Wine Circle funciona"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onKeyDown={onKeyDown}
      onTouchStart={(e) => { toqueX.current = e.touches[0].clientX; setPausado(true); }}
      onTouchEnd={(e) => {
        if (toqueX.current === null) return;
        const dx = e.changedTouches[0].clientX - toqueX.current;
        if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1));
        toqueX.current = null;
      }}
      style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}
    >
      {/* Palco */}
      <div style={{
        position: 'relative', height: 348, overflow: 'hidden',
        display: 'flex', justifyContent: 'center',
      }}>
        {SLIDES.map((s, i) => {
          const Tela = s.tela;
          const distancia = i - atual;
          const visivel = distancia === 0;
          return (
            <div
              key={s.titulo}
              aria-hidden={!visivel}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', justifyContent: 'center',
                opacity: visivel ? 1 : 0,
                transform: visivel
                  ? 'translateX(0) scale(1)'
                  : `translateX(${distancia > 0 ? 28 : -28}px) scale(0.94)`,
                transition: reduzMovimento ? 'none' : 'opacity .5s ease, transform .5s cubic-bezier(.22,.61,.36,1)',
                pointerEvents: visivel ? 'auto' : 'none',
              }}
            >
              <Tela />
            </div>
          );
        })}
      </div>

      {/* Texto — região viva, para leitor de tela anunciar a troca */}
      <div aria-live="polite" style={{ textAlign: 'center', marginTop: 18, minHeight: 92 }}>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700,
          color: 'var(--md-on-surface)', marginBottom: 6,
        }}>{SLIDES[atual].titulo}</h2>
        <p style={{
          fontSize: 14, lineHeight: 1.55, color: 'var(--md-on-surface-variant)',
          maxWidth: 330, margin: '0 auto',
        }}>{SLIDES[atual].texto}</p>
      </div>

      {/* Passos */}
      <div role="tablist" aria-label="Escolher funcionalidade"
        style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
        {SLIDES.map((s, i) => (
          <button
            key={s.titulo}
            role="tab"
            aria-selected={i === atual}
            aria-label={`${i + 1} de ${SLIDES.length}: ${s.titulo}`}
            data-testid={`slide-${i}`}
            onClick={() => { setPausado(true); ir(i); }}
            style={{
              height: 6, width: i === atual ? 26 : 6, borderRadius: 3,
              border: 'none', padding: 0, cursor: 'pointer',
              background: i === atual ? 'var(--md-primary)' : 'var(--md-outline-variant)',
              transition: reduzMovimento ? 'none' : 'width .35s ease, background .35s ease',
            }}
          />
        ))}
      </div>
    </section>
  );
};
