import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useInstalarApp, navegadorIOS } from '../hooks/useInstalarApp';
import { GuiaInstalacao } from './GuiaInstalacao';
import { configurarGuia } from '../utils/guiaInstalacao';

/**
 * Convite para instalar o app na tela de início.
 *
 * No Android e no desktop é um clique só: o navegador abre o diálogo nativo e
 * o ícone aparece na tela. No iPhone não existe esse caminho — a Apple não
 * implementa `beforeinstallprompt` — então mostramos o passo a passo do menu
 * Compartilhar, que é o único jeito por lá.
 *
 * Some sozinho quando o app já está instalado.
 */

const CHAVE_DISPENSADO = 'wc_instalar_dispensado';

// ── Folha com o passo a passo do iOS ──

const FolhaIOS: React.FC<{ onFechar: () => void }> = ({ onFechar }) => {
  const painel = useRef<HTMLDivElement>(null);
  const nav = navegadorIOS();
  const emAppDeTerceiro = nav === 'in-app';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onFechar]);

  const titulo = emAppDeTerceiro
    ? 'Abra no navegador do iPhone'
    : configurarGuia(nav, null).titulo;

  return (
    <div className="auth-scrim" role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div ref={painel} className="auth-sheet" role="dialog" aria-modal="true"
        aria-labelledby="instalar-titulo" data-testid="instalar-ios">
        <div className="auth-grabber" aria-hidden="true" />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <h2 id="instalar-titulo" style={{
            fontFamily: 'Playfair Display, serif', fontSize: 21, fontWeight: 700,
            color: 'var(--md-on-surface)', flex: 1,
          }}>{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            data-testid="instalar-fechar"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: 'var(--md-on-surface-variant)', lineHeight: 0,
            }}>
            <span className="material-symbols-rounded" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        {emAppDeTerceiro ? (
          /* Navegador embutido em outro app não tem "Adicionar à Tela de
             Início" — a opção nem aparece no menu. Como o convite do clube
             circula por link, este é um caminho comum, e ensinar o gesto aqui
             mandaria a pessoa procurar o que não existe. */
          <div data-testid="instalar-in-app">
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', lineHeight: 1.55, marginBottom: 18 }}>
              Você abriu o Wine Circle por dentro de outro app. Aqui o iPhone não
              oferece a opção de instalar — ela só existe no navegador de verdade.
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
              {[
                ['more_horiz', 'Toque no menu (⋯ ou ⋮), no canto da tela'],
                ['open_in_browser', 'Escolha "Abrir no Safari" ou "Abrir no navegador"'],
                ['install_mobile', 'Lá dentro, toque em Instalar de novo'],
              ].map(([icone, texto], i) => (
                <li key={icone} style={{ display: 'flex', gap: 13, alignItems: 'center' }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                    background: 'var(--md-primary-container)',
                    color: 'var(--md-on-primary-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 20 }}>{icone}</span>
                  </span>
                  <span style={{ flex: 1, fontSize: 14.5, color: 'var(--md-on-surface)', lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--md-primary)' }}>{i + 1}.</strong> {texto}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--md-on-surface-variant)', lineHeight: 1.5, marginBottom: 18 }}>
              No iPhone nenhum app se instala sozinho — a Apple não permite.
              São três toques seus:
            </p>
            <GuiaInstalacao />
          </>
        )}

        <div style={{
          marginTop: 20, padding: 13, borderRadius: 14,
          background: 'var(--md-surface-container-high)',
          fontSize: 13, color: 'var(--md-on-surface-variant)', lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--md-on-surface)' }}>Só instalado</strong> o
          iPhone entrega notificação de acerto de conta — é uma exigência da
          Apple, não uma escolha nossa. E o app para de ser esquecido: o iPhone
          apaga os dados de site que fica dias sem abrir.
        </div>

        <button type="button" onClick={onFechar}
          style={{
            width: '100%', height: 50, marginTop: 18,
            borderRadius: 'var(--shape-full)', border: 'none', cursor: 'pointer',
            background: 'var(--md-primary)', color: 'var(--md-on-primary)',
            fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
          }}>Entendi</button>
      </div>
    </div>
  );
};

// ── Convite ──

interface Props {
  /** 'faixa' na entrada, 'linha' dentro do perfil. */
  variante?: 'faixa' | 'linha';
}

export const InstalarApp: React.FC<Props> = ({ variante = 'faixa' }) => {
  const { modo, instalar } = useInstalarApp();
  const [mostrarIOS, setMostrarIOS] = useState(false);
  const [dispensado, setDispensado] = useState(
    () => localStorage.getItem(CHAVE_DISPENSADO) === '1',
  );

  if (modo === 'instalado' || modo === 'indisponivel') return null;
  if (dispensado && variante === 'faixa') return null;

  const aoClicar = async () => {
    if (modo === 'manual-ios') { setMostrarIOS(true); return; }
    const escolha = await instalar();
    if (escolha === 'accepted') toast.success('Instalando — procure o ícone na tela de início');
  };

  const dispensar = () => {
    localStorage.setItem(CHAVE_DISPENSADO, '1');
    setDispensado(true);
  };

  if (variante === 'linha') {
    return (
      <>
        <button type="button" onClick={aoClicar} data-testid="instalar-linha"
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '16px 20px', minHeight: 56, background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
          <span className="material-symbols-rounded" aria-hidden="true"
            style={{ fontSize: 22, color: 'var(--md-on-surface-variant)', flexShrink: 0 }}>
            install_mobile
          </span>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--md-on-surface)' }}>
            Instalar na tela de início
          </span>
          <span className="material-symbols-rounded" aria-hidden="true"
            style={{ fontSize: 18, color: 'var(--md-on-surface-variant)' }}>chevron_right</span>
        </button>
        {mostrarIOS && <FolhaIOS onFechar={() => setMostrarIOS(false)} />}
      </>
    );
  }

  return (
    <>
      <div data-testid="instalar-faixa" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', maxWidth: 420, margin: '0 auto',
        padding: '10px 12px', borderRadius: 16,
        background: 'var(--md-surface-container)',
        border: '1px solid var(--md-outline-variant)',
      }}>
        <span style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--md-primary), var(--md-tertiary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-symbols-rounded" aria-hidden="true"
            style={{ fontSize: 20, color: '#fff' }}>install_mobile</span>
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--md-on-surface)' }}>
            Instalar como app
          </p>
          <p style={{
            fontSize: 12, color: 'var(--md-on-surface-variant)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Abre direto do ícone
          </p>
        </div>

        <button type="button" onClick={aoClicar} data-testid="instalar-botao"
          style={{
            background: 'var(--md-primary)', color: 'var(--md-on-primary)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 600, padding: '9px 16px',
            borderRadius: 'var(--shape-full)', flexShrink: 0,
          }}>Instalar</button>

        <button type="button" onClick={dispensar} aria-label="Agora não"
          data-testid="instalar-dispensar"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'var(--md-on-surface-variant)', lineHeight: 0, flexShrink: 0,
          }}>
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>

      {mostrarIOS && <FolhaIOS onFechar={() => setMostrarIOS(false)} />}
    </>
  );
};
