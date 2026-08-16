import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { suggestWines, searchWine, describeError, type WineSuggestion } from '../services/pocketbase';
import type { Wine } from '../types';

/**
 * Campo de adicionar vinho, com sugestões do catálogo local.
 *
 * Antes era só um campo de texto com um botão de lupa: você digitava
 * "Catena Malbec", ele tentava casar o nome exato contra o catálogo, não
 * achava e mandava adicionar manualmente. Os 245 mil vinhos ficavam ali sem
 * servir para nada.
 *
 * Agora as sugestões aparecem enquanto você digita, já com uva, safra e
 * região — escolher uma preenche o vinho inteiro. Digitar um nome que não
 * está no catálogo continua funcionando: entra como manual, ou resolve por
 * IA se houver provedor configurado.
 */

interface Props {
  onAdicionar: (wine: Wine) => void;
  /** Se o servidor tem catálogo ou provedor — sem isso, só entrada manual. */
  temBusca: boolean;
}

export const BuscaVinho: React.FC<Props> = ({ onAdicionar, temBusca }) => {
  const [texto, setTexto] = useState('');
  const [sugestoes, setSugestoes] = useState<WineSuggestion[]>([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [ativa, setAtiva] = useState(-1);

  const caixa = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fecha ao tocar fora
  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const buscar = useCallback(async (q: string) => {
    if (!temBusca || q.trim().length < 2) { setSugestoes([]); return; }
    try {
      const r = await suggestWines(q.trim());
      setSugestoes(r);
      setAberto(r.length > 0);
      setAtiva(-1);
    } catch {
      setSugestoes([]);
    }
  }, [temBusca]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => buscar(texto), 220);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [texto, buscar]);

  /** Escolher uma sugestão já traz os metadados — não precisa ir ao servidor. */
  const escolher = (s: WineSuggestion) => {
    onAdicionar({
      id: crypto.randomUUID(),
      name: s.name,
      producer: s.winery,
      grape: s.grape,
      country: s.country,
      region: s.region,
      year: s.year,
      type: s.type as Wine['type'],
    });
    setTexto('');
    setSugestoes([]);
    setAberto(false);
    toast.success('Vinho adicionado');
  };

  /** Nome que não está na lista: tenta resolver, senão entra como manual. */
  const adicionarPeloTexto = async () => {
    const q = texto.trim();
    if (!q) return;
    setAberto(false);

    if (!temBusca) {
      onAdicionar({ id: crypto.randomUUID(), name: q });
      setTexto('');
      toast.success('Vinho adicionado');
      return;
    }

    setBuscando(true);
    try {
      onAdicionar(await searchWine(q));
      setTexto('');
      toast.success('Vinho adicionado');
    } catch (err) {
      // Fora do catálogo e sem provedor de IA: o nome digitado vale
      onAdicionar({ id: crypto.randomUUID(), name: q });
      setTexto('');
      toast(`Adicionado como você digitou — ${describeError(err).toLowerCase()}`, { icon: '📝' });
    } finally {
      setBuscando(false);
    }
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (!aberto || sugestoes.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); adicionarPeloTexto(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtiva((i) => Math.min(i + 1, sugestoes.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtiva((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (ativa >= 0) escolher(sugestoes[ativa]);
      else adicionarPeloTexto();
    } else if (e.key === 'Escape') { setAberto(false); }
  };

  /** "Other" vem do dataset de varejo como país e não informa nada — some. */
  const util = (v?: string) => (v && v.toLowerCase() !== 'other' ? v : undefined);

  const detalhe = (s: WineSuggestion) =>
    [util(s.winery), util(s.grape), util(s.region) || util(s.country)]
      .filter(Boolean).join(' · ');

  return (
    <div ref={caixa} style={{ position: 'relative' }}>
      <div className="flex gap-2">
        <input
          type="text" value={texto} data-testid="wine-input"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
          placeholder={temBusca ? 'Comece a digitar o nome do vinho' : 'Nome do vinho (ex: Catena Malbec 2020)'}
          autoComplete="off"
          role="combobox" aria-expanded={aberto} aria-autocomplete="list"
          aria-controls="sugestoes-vinho"
          className="input-outlined flex-1"
          style={{ minHeight: 48, borderRadius: 'var(--shape-large)' }}
        />
        <button type="button" onClick={adicionarPeloTexto} disabled={buscando || !texto.trim()}
          data-testid="wine-add" className="btn-primary" title="Adicionar"
          style={{
            minWidth: 48, minHeight: 48, padding: '0 12px',
            borderRadius: 'var(--shape-large)', opacity: texto.trim() ? 1 : 0.4,
          }}>
          {buscando
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20 }}>add</span>}
        </button>
      </div>

      {aberto && sugestoes.length > 0 && (
        <ul id="sugestoes-vinho" role="listbox" data-testid="sugestoes-vinho"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30,
            listStyle: 'none', margin: 0, padding: 6,
            background: 'var(--md-surface-container-low)',
            border: '1px solid var(--md-outline-variant)',
            borderRadius: 'var(--shape-large)',
            boxShadow: '0 10px 28px -8px rgba(60,12,17,0.28)',
            maxHeight: 300, overflowY: 'auto',
          }}>
          {sugestoes.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === ativa}>
              <button type="button" data-testid={`sugestao-${i}`}
                onMouseEnter={() => setAtiva(i)}
                onClick={() => escolher(s)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                  background: i === ativa ? 'var(--md-surface-container-high)' : 'transparent',
                }}>
                <span style={{
                  display: 'block', fontSize: 14, fontWeight: 500,
                  color: 'var(--md-on-surface)',
                }}>{s.name}</span>
                {detalhe(s) && (
                  <span style={{
                    display: 'block', fontSize: 12, marginTop: 2,
                    color: 'var(--md-on-surface-variant)',
                  }}>{detalhe(s)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="type-body-small" style={{ marginTop: 8, color: 'var(--md-on-surface-variant)' }}>
        {temBusca
          ? 'Escolha da lista para preencher uva, safra e região. Não achou? Digite e toque em +.'
          : 'Digite o nome como está no rótulo, com a safra.'}
      </p>
    </div>
  );
};
