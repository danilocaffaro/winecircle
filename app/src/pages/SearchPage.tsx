import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { searchWine, getWineSuggestions } from '../services/gemini';
import { WineCard } from '../components/WineCard';
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

const filterChips: { label: string; value: WineType | 'all'; color: string }[] = [
  { label: 'All',       value: 'all',       color: '' },
  { label: '🔴 Red',    value: 'red',       color: 'chip-red' },
  { label: '⚪ White',  value: 'white',     color: 'chip-white' },
  { label: '🌸 Rosé',   value: 'rosé',      color: 'chip-rose' },
  { label: '✨ Sparkling', value: 'sparkling', color: 'chip-sparkling' },
  { label: '🍯 Dessert', value: 'dessert',  color: 'chip-dessert' },
];

const POPULAR = ['Château Margaux', 'Opus One', 'Tignanello', 'Barolo DOCG', 'Malbec Mendoza', 'Dom Pérignon'];

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Wine[]>([]);
  const [activeFilter, setActiveFilter] = useState<WineType | 'all'>('all');

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecent);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced suggestions fetch
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    setLoadingSuggestions(true);
    setSuggestionsError(false);
    setShowDropdown(true);
    try {
      const res = await getWineSuggestions(q.trim());
      setSuggestions(res.slice(0, 5));
      setShowDropdown(true);
    } catch (err) {
      console.error('Suggestions failed:', err);
      setSuggestions([]);
      setSuggestionsError(true);
      setShowDropdown(true);
    }
    finally { setLoadingSuggestions(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  // Click outside to close dropdown
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
        toast.success(`Found: ${wine.name}`, { icon: '🍷' });
      } else {
        toast.error('No results found');
      }
    } catch {
      toast.error('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestion >= 0) handleSuggestionClick(items[activeSuggestion]);
      else handleSearch();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const filtered = activeFilter === 'all' ? results : results.filter(w => w.type === activeFilter);
  const dropdownItems = suggestions.length > 0 ? suggestions : [];
  const showRecent = query.trim().length === 0 && recentSearches.length > 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-6">

      {/* ── Search bar with autocomplete ── */}
      <div className="relative">
        <div className="relative">
          {/* Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {searching
              ? <div className="w-5 h-5 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" />
              : (
                <svg className="w-5 h-5 text-charcoal-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )
            }
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); setActiveSuggestion(-1); }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search wines, regions, grapes..."
            autoComplete="off"
            spellCheck={false}
            className="w-full pl-12 pr-14 py-3.5 rounded-2xl border-2 border-cream-dark bg-white text-charcoal placeholder-charcoal-muted focus:border-burgundy transition-all shadow-sm"
            style={{ fontSize: '16px', minHeight: '52px', boxShadow: showDropdown && (dropdownItems.length > 0 || showRecent) ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}
          />

          {/* Clear button */}
          {query && (
            <button
              onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-cream-dark flex items-center justify-center hover:bg-cream-deeper transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-charcoal-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Autocomplete dropdown ── */}
        {showDropdown && (dropdownItems.length > 0 || showRecent || (loadingSuggestions && query.trim().length >= 2) || (suggestionsError && query.trim().length >= 2)) && (
          <div ref={dropdownRef} className="search-dropdown">

            {/* Loading state */}
            {loadingSuggestions && dropdownItems.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-4 h-4 border-2 border-burgundy/20 border-t-burgundy rounded-full animate-spin flex-shrink-0" />
                <span className="text-sm text-charcoal-muted">Finding suggestions...</span>
              </div>
            )}

            {/* Error state */}
            {suggestionsError && !loadingSuggestions && dropdownItems.length === 0 && query.trim().length >= 2 && (
              <div className="px-4 py-3 text-sm text-charcoal-muted">
                <span>AI suggestions unavailable — press Enter to search</span>
              </div>
            )}

            {/* AI suggestions */}
            {dropdownItems.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="section-label">Suggestions</span>
                </div>
                {dropdownItems.map((s, i) => (
                  <button
                    key={s}
                    className={`search-suggestion w-full text-left ${activeSuggestion === i ? 'bg-cream' : ''}`}
                    onMouseDown={() => handleSuggestionClick(s)}
                    onMouseEnter={() => setActiveSuggestion(i)}
                  >
                    <div className="w-8 h-8 rounded-full bg-burgundy-glow flex items-center justify-center flex-shrink-0">
                      <span className="text-base">🍷</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Highlight matching part */}
                      <HighlightMatch text={s} query={query} />
                    </div>
                    <svg className="w-4 h-4 text-charcoal-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </button>
                ))}
              </>
            )}

            {/* Recent searches */}
            {showRecent && (
              <>
                <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                  <span className="section-label">Recent</span>
                  <button
                    className="text-xs text-charcoal-muted hover:text-burgundy transition-colors"
                    onMouseDown={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); setShowDropdown(false); }}
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((r, i) => (
                  <button
                    key={`recent-${i}`}
                    className="search-suggestion w-full text-left"
                    onMouseDown={() => handleSuggestionClick(r)}
                  >
                    <div className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-charcoal-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="flex-1 text-sm text-charcoal">{r}</span>
                    <svg className="w-4 h-4 text-charcoal-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Filter chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {filterChips.map(chip => (
          <button
            key={chip.value}
            onClick={() => setActiveFilter(chip.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 min-h-[40px] ${
              activeFilter === chip.value
                ? 'bg-burgundy text-cream shadow-sm'
                : `bg-white border border-cream-dark text-charcoal-light hover:border-burgundy/30 ${chip.color}`
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Searching skeleton ── */}
      {searching && (
        <div className="space-y-3 fade-in">
          {[1,2].map(i => (
            <div key={i} className="card p-4 flex gap-3">
              <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 shimmer rounded-full w-3/4" />
                <div className="h-3 shimmer rounded-full w-1/2" />
                <div className="h-3 shimmer rounded-full w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {!searching && filtered.length > 0 && (
        <div className="space-y-3 fade-in">
          <div className="flex items-center justify-between">
            <span className="section-label">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            {results.length > 0 && (
              <button
                onClick={() => setResults([])}
                className="text-xs text-charcoal-muted hover:text-burgundy transition-colors font-medium"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((wine, i) => (
              <div key={wine.id} className={`fade-in fade-in-delay-${Math.min(i, 3) as 0|1|2|3}`}>
                <WineCard wine={wine} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!searching && results.length === 0 && (
        <div className="text-center py-8 fade-in">
          <div className="w-24 h-24 mx-auto mb-5 rounded-full wine-gradient-red flex items-center justify-center shadow-lg">
            <span className="text-5xl">🍷</span>
          </div>
          <h3 className="font-bold text-burgundy text-xl mb-1.5" style={{ fontFamily: 'Playfair Display, serif' }}>
            Discover Wines
          </h3>
          <p className="text-charcoal-muted text-sm mb-7 max-w-xs mx-auto leading-relaxed">
            Search any wine by name, region, or grape variety and get AI-powered tasting notes and details
          </p>

          {/* Popular searches */}
          <div className="space-y-3">
            <p className="section-label">Popular searches</p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); handleSearch(s); }}
                  className="text-xs font-semibold bg-white border border-cream-dark text-charcoal-light px-4 py-2.5 rounded-full hover:bg-burgundy hover:text-cream hover:border-burgundy transition-all duration-200 min-h-[40px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Highlight matching query in suggestion text ── */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span className="text-sm text-charcoal font-medium">{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <span className="text-sm text-charcoal font-medium">{text}</span>;
  return (
    <span className="text-sm font-medium text-charcoal">
      {text.slice(0, idx)}
      <mark className="bg-gold-glow text-charcoal not-italic font-bold" style={{ background: 'var(--gold-glow)' }}>
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </span>
  );
}
