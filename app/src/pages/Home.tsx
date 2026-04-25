import React from 'react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ── HERO ── */}
      <div
        className="fade-in"
        style={{
          margin: '0 -16px',
          padding: '48px 24px 40px',
          background: 'linear-gradient(160deg, var(--md-primary-container) 0%, var(--md-surface-container-low) 60%)',
          borderBottom: '1px solid rgba(201,162,96,0.12)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: -60, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(194,80,112,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -20,
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,162,96,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <p style={{ fontSize: 13, color: 'var(--dp-cream-muted)', letterSpacing: '0.06em', marginBottom: 8 }}>
          {greeting}
        </p>

        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 36,
          fontWeight: 700,
          lineHeight: 1.15,
          color: 'var(--dp-cream)',
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          Taste the wine,<br />
          <span style={{ color: 'var(--dp-gold)' }}>not the label.</span>
        </h1>

        <p style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--dp-cream-muted)',
          marginBottom: 28,
          maxWidth: 300,
        }}>
          Host blind tastings with friends. Discover what you truly love.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to="/clubs"
            className="btn-primary"
            style={{
              background: 'var(--dp-gold)',
              color: 'var(--md-on-primary)',
              fontWeight: 600,
              fontSize: 14,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>add</span>
            Create a Club
          </Link>
          <Link
            to="/search"
            className="btn-outlined"
            style={{
              borderColor: 'rgba(240,232,220,0.20)',
              color: 'var(--dp-cream)',
              fontSize: 14,
            }}
          >
            Discover Wines
          </Link>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ marginTop: 32 }} className="fade-in fade-in-delay-1">
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--dp-gold)',
          marginBottom: 20,
        }}>
          How it works
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            {
              n: '01',
              title: 'Create your club',
              desc: 'Invite friends. Set the date and theme.',
              icon: 'group_add',
            },
            {
              n: '02',
              title: 'Taste blind',
              desc: 'Everyone scores each wine without seeing the label.',
              icon: 'masks',
            },
            {
              n: '03',
              title: 'Reveal & celebrate',
              desc: 'Uncover which wine won — and who guessed right.',
              icon: 'celebration',
            },
          ].map((step, i) => (
            <div
              key={step.n}
              style={{
                display: 'flex',
                gap: 16,
                padding: '20px 0',
                borderBottom: i < 2 ? '1px solid var(--dp-border)' : 'none',
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid var(--dp-gold-faint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'var(--dp-gold-faint)',
              }}>
                <span
                  className="material-symbols-rounded ms-filled"
                  style={{ fontSize: 20, color: 'var(--dp-gold)' }}
                >
                  {step.icon}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--dp-cream-faint)', letterSpacing: '0.06em' }}>{step.n}</span>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dp-cream)' }}>{step.title}</p>
                </div>
                <p style={{ fontSize: 14, color: 'var(--dp-cream-muted)', lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WHAT MAKES IT DIFFERENT ── */}
      <div
        style={{
          marginTop: 32,
          padding: '24px 20px',
          background: 'var(--dp-surface-1)',
          borderRadius: 16,
          border: '1px solid var(--dp-border)',
        }}
        className="fade-in fade-in-delay-2"
      >
        <p style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--dp-cream)',
          marginBottom: 8,
          lineHeight: 1.3,
        }}>
          "Blind tasting changed the way I buy wine."
        </p>
        <p style={{ fontSize: 14, color: 'var(--dp-cream-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          When you can't see the label, a R$45 bottle regularly beats a R$300 one.
          Your palate knows more than the price tag suggests.
        </p>
        <Link
          to="/search"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--dp-gold)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Browse wines
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>arrow_forward</span>
        </Link>
      </div>

    </div>
  );
};

export default Home;
