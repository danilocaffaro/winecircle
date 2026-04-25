import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { searchWine, getWineSuggestions } from '../services/gemini';
import { WineCard } from '../components/WineCard';
import { SEED_WINES } from '../data/seedData';
import type { Wine, WineType } from '../types';

const RECENT_KEY = 'winecircle_recent_searches';
const MAX_RECENT = 6;

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function addRecent(q: string) {
  const list = [q, ...getRecent().filter(r => r !== q)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

const filterChips: { label: string; value: WineType | 'all'; icon: string }[] = [
  { label: 'All',       value: 'all',       icon: 'apps' },
  { label: 'Red',       value: 'red',       icon: 'water_drop' },
  { label: 'White',     value: 'white',     icon: 'light_mode' },
  { label: 'Rosé',      value: 'rosé',      icon: 'local_florist' },
  { label: 'Sparkling', value: 'sparkling', icon: 'bubble_chart' },
  { label: 'Dessert',   value: 'dessert',   icon: 'cake' },
];

const POPULAR = ['Château Margaux', 'Opus One', 'Tignanello', 'Barolo DOCG', 'Malbec Mendoza', 'Dom Pérignon'];

/* ── Curated editorial content (makes the page feel alive) ── */
const CURATED_COLLECTIONS = [
  {
    title: 'Under R$100',
    subtitle: 'Exceptional value finds',
    icon: 'local_offer',
    gradient: 'linear-gradient(135deg, #FFDADB 0%, #F4DDDE 100%)',
    query: 'best wines under 100 reais',
  },
  {
    title: 'Bold Reds',
    subtitle: 'Full body, rich flavor',
    icon: 'local_fire_department',
    gradient: 'linear-gradient(135deg, #FFDDB4 0%, #F2E5E5 100%)',
    query: 'bold red wines Cabernet Malbec',
  },
  {
    title: 'Summer Whites',
    subtitle: 'Crisp & refreshing',
    icon: 'wb_sunny',
    gradient: 'linear-gradient(135deg, #E4D7D7 0%, #D7C1C2 100%)',
    query: 'crisp white wines Sauvignon Blanc',
  },
  {
    title: 'Blind Tasting Picks',
    subtitle: 'Crowd favorites revealed',
    icon: 'masks',
    gradient: 'linear-gradient(135deg, #F4DDDE 0%, #ECE0DF 100%)',
    query: 'popular blind tasting wines',
  },
];

const REGIONS = [
  { name: 'Bordeaux',    emoji: '🇫🇷', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=120&fit=crop' },
  { name: 'Tuscany',     emoji: '🇮🇹', img: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=200&h=120&fit=crop' },
  { name: 'Mendoza',     emoji: '🇦🇷', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=120&fit=crop' },
  { name: 'Napa Valley', emoji: '🇺🇸', img: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=200&h=120&fit=crop' },
  { name: 'Douro',       emoji: '🇵🇹', img: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=200&h=120&fit=crop' },
];

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Wine[]>([]);
  const [activeFilter, setActiveFilter] = useState<WineType | 'all'>('all');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    setSuggestionsError(false);
    setShowDropdown(true);

    // Local seed data matches first (instant, no API call)
    const lower = q.trim().toLowerCase();
    
    // Prioritize name matches, then grape/producer
    const nameMatches = SEED_WINES
      .filter(w => w.name.toLowerCase().includes(lower))
      .map(w => w.name);
    const grapeMatches = SEED_WINES
      .filter(w => !w.name.toLowerCase().includes(lower) && (w.grape?.toLowerCase().includes(lower) || w.producer?.toLowerCase().includes(lower)))
      .map(w => `${w.name} (${w.grape})`);

    // Also check popular searches
    const popularMatches = POPULAR
      .filter(p => p.toLowerCase().includes(lower));

    const localResults = [...new Set([...nameMatches, ...popularMatches, ...grapeMatches])].slice(0, 5);

    if (localResults.length >= 3) {
      // Enough local results, skip AI
      setSuggestions(localResults);
      setLoadingSuggestions(false);
      return;
    }

    try {
      const aiRes = await getWineSuggestions(q.trim());
      // Merge: local first, then AI (deduplicated)
      const merged = [...new Set([...localResults, ...aiRes])].slice(0, 5);
      setSuggestions(merged);
      setShowDropdown(true);
    } catch (err) {
      console.error('Suggestions failed:', err);
      // Fall back to local results even if AI fails
      setSuggestions(localResults.length > 0 ? localResults : []);
      setSuggestionsError(localResults.length === 0);
      setShowDropdown(true);
    } finally { setLoadingSuggestions(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery || query).trim();
    if (!q) return;
    setShowDropdown(false);
    setSearching(true);
    addRecent(q);
    setRecentSearches(getRecent());
    try {
      const wine = await searchWine(q);
      if (wine) {
        setResults(prev => [wine, ...prev.filter(w => w.name !== wine.name)]);
        toast.success(`Found: ${wine.name}`);
      } else {
        toast.error('No results found');
      }
    } catch {
      toast.error('Search failed. Check your connection.');
    } finally { setSearching(false); }
  };

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    setShowDropdown(false);
    setSuggestions([]);
    handleSearch(s);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions.length > 0 ? suggestions : [];
    if (!showDropdown || items.length === 0) {
      if (e.key === 'Enter') handleSearch();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestion(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); activeSuggestion >= 0 ? handleSuggestionClick(items[activeSuggestion]) : handleSearch(); }
    else if (e.key === 'Escape') setShowDropdown(false);
  };

  const filtered = activeFilter === 'all' ? results : results.filter(w => w.type === activeFilter);
  const dropdownItems = suggestions.length > 0 ? suggestions : [];
  const showRecent = query.trim().length === 0 && recentSearches.length > 0;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 24 }}>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 10 }}>
            {searching
              ? <div style={{ width: 20, height: 20, border: '2px solid var(--dp-cream-faint)', borderTopColor: 'var(--dp-gold)', borderRadius: '50%' }} className="animate-spin" />
              : <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--dp-cream-faint)' }}>search</span>
            }
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); setActiveSuggestion(-1); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar vinhos, regions, grapes..."
            autoComplete="off"
            spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 52, paddingRight: query ? 52 : 16,
              height: 52,
              borderRadius: 'var(--shape-full)',
              background: 'var(--dp-surface-2)',
              border: '1px solid var(--dp-border)',
              outline: 'none',
              fontSize: 15, fontWeight: 500,
              letterSpacing: '0.3px',
              color: 'var(--dp-cream)',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus(); }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 36, height: 36, borderRadius: '50%', border: 'none',
                background: 'transparent', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--dp-cream-faint)' }}>close</span>
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && (dropdownItems.length > 0 || showRecent || (loadingSuggestions && query.trim().length >= 2) || (suggestionsError && query.trim().length >= 2)) && (
          <div ref={dropdownRef} style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'var(--dp-surface-3)', borderRadius: 16,
            border: '1px solid var(--dp-border-medium)',
            marginTop: 8, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {loadingSuggestions && dropdownItems.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--dp-cream-faint)', borderTopColor: 'var(--dp-gold)', borderRadius: '50%' }} className="animate-spin" />
                <span style={{ fontSize: 14, color: 'var(--dp-cream-faint)' }}>Finding suggestions...</span>
              </div>
            )}
            {suggestionsError && !loadingSuggestions && dropdownItems.length === 0 && query.trim().length >= 2 && (
              <div style={{ padding: '12px 16px', fontSize: 14, color: 'var(--dp-cream-faint)' }}>
                AI suggestions unavailable — press Enter to search
              </div>
            )}
            {dropdownItems.length > 0 && (
              <>
                <div style={{ padding: '12px 16px 6px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--dp-cream-faint)' }}>Suggestions</span>
                </div>
                {dropdownItems.map((s, i) => (
                  <button
                    key={s}
                    style={{
                      width: '100%', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', border: 'none', cursor: 'pointer',
                      background: activeSuggestion === i ? 'var(--dp-surface-4)' : 'transparent',
                      color: 'var(--dp-cream)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                    }}
                    onMouseDown={() => handleSuggestionClick(s)}
                    onMouseEnter={() => setActiveSuggestion(i)}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--dp-gold-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-rounded ms-filled" style={{ fontSize: 16, color: 'var(--dp-gold)' }}>wine_bar</span>
                    </div>
                    <HighlightMatch text={s} query={query} />
                  </button>
                ))}
              </>
            )}
            {showRecent && (
              <>
                <div style={{ padding: '12px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--dp-cream-faint)' }}>Recent</span>
                  <button
                    style={{ fontSize: 12, color: 'var(--dp-cream-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseDown={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); setShowDropdown(false); }}
                  >Clear</button>
                </div>
                {recentSearches.map((r, i) => (
                  <button
                    key={`recent-${i}`}
                    style={{
                      width: '100%', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px', border: 'none', cursor: 'pointer',
                      background: 'transparent', fontFamily: 'inherit', fontSize: 14,
                      color: 'var(--dp-cream-muted)',
                    }}
                    onMouseDown={() => handleSuggestionClick(r)}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: 'var(--dp-cream-faint)' }}>history</span>
                    <span style={{ flex: 1 }}>{r}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 24 }}>
        {filterChips.map(chip => {
          const active = activeFilter === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setActiveFilter(chip.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', height: 36,
                borderRadius: 'var(--shape-full)',
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const,
                cursor: 'pointer', border: '1px solid',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                ...(active ? {
                  background: 'var(--dp-gold-faint)',
                  borderColor: 'var(--dp-gold)',
                  color: 'var(--dp-gold)',
                } : {
                  background: 'transparent',
                  borderColor: 'var(--dp-border-medium)',
                  color: 'var(--dp-cream-muted)',
                }),
              }}
            >
              {active && <span className="material-symbols-rounded ms-filled" style={{ fontSize: 16 }}>check</span>}
              <span className="material-symbols-rounded" style={{ fontSize: 16, opacity: active ? 1 : 0.7 }}>{chip.icon}</span>
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Searching skeleton ── */}
      {searching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="fade-in">
          {[1,2].map(i => (
            <div key={i} style={{ background: 'var(--dp-surface-1)', borderRadius: 16, padding: 16, display: 'flex', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--dp-surface-3)' }} className="shimmer" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                <div style={{ height: 16, borderRadius: 8, width: '75%', background: 'var(--dp-surface-3)' }} className="shimmer" />
                <div style={{ height: 12, borderRadius: 8, width: '50%', background: 'var(--dp-surface-3)' }} className="shimmer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {!searching && filtered.length > 0 && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--dp-cream-faint)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setResults([])}
              style={{ fontSize: 13, color: 'var(--dp-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
            >Clear all</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {filtered.map((wine, i) => (
              <div key={wine.id} className={`fade-in fade-in-delay-${Math.min(i, 3) as 0|1|2|3}`}>
                <WineCard wine={wine} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Discovery content (when no search results) ── */}
      {!searching && results.length === 0 && (
        <div className="fade-in">

          {/* Curated collections */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: 'var(--dp-gold)',
              marginBottom: 16,
            }}>Collections</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {CURATED_COLLECTIONS.map(col => (
                <button
                  key={col.title}
                  onClick={() => { setQuery(col.query); handleSearch(col.query); }}
                  style={{
                    textAlign: 'left' as const, border: '1px solid var(--dp-border)',
                    borderRadius: 16, padding: '20px 16px',
                    background: col.gradient,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--dp-gold)' }}>
                    {col.icon}
                  </span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dp-cream)', marginBottom: 2 }}>{col.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--dp-cream-faint)', lineHeight: 1.4 }}>{col.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Regions */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: 'var(--dp-gold)',
              marginBottom: 16,
            }}>Explore by Region</p>

            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {REGIONS.map(region => (
                <button
                  key={region.name}
                  onClick={() => { setQuery(`best wines from ${region.name}`); handleSearch(`best wines from ${region.name}`); }}
                  style={{
                    flexShrink: 0, width: 120,
                    border: '1px solid var(--dp-border)', borderRadius: 16,
                    overflow: 'hidden', cursor: 'pointer',
                    background: 'var(--dp-surface-1)',
                    fontFamily: 'inherit',
                    textAlign: 'center' as const,
                  }}
                >
                  <div style={{
                    width: '100%', height: 72,
                    background: `url(${region.img}) center/cover`,
                    opacity: 0.7,
                  }} />
                  <div style={{ padding: '10px 8px 12px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dp-cream)' }}>{region.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Popular searches */}
          <div>
            <p style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const, color: 'var(--dp-gold)',
              marginBottom: 16,
            }}>Popular Searches</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {POPULAR.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); handleSearch(s); }}
                  style={{
                    padding: '8px 16px', height: 36,
                    borderRadius: 'var(--shape-full)',
                    border: '1px solid var(--dp-border-medium)',
                    background: 'transparent',
                    color: 'var(--dp-cream-muted)',
                    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' as const,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

/* ── Highlight matching query ── */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dp-cream)' }}>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dp-cream)' }}>{text}</span>;
  return (
    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dp-cream)', flex: 1, minWidth: 0 }}>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--dp-gold-faint)', color: 'var(--dp-gold-light)', fontWeight: 700 }}>
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </span>
  );
}
