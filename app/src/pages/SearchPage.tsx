import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { searchWine } from '../services/gemini';
import { WineCard } from '../components/WineCard';
import type { Wine, WineType } from '../types';

const filterChips: { label: string; value: WineType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🔴 Red', value: 'red' },
  { label: '⚪ White', value: 'white' },
  { label: '🌸 Rosé', value: 'rosé' },
  { label: '✨ Sparkling', value: 'sparkling' },
];

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Wine[]>([]);
  const [activeFilter, setActiveFilter] = useState<WineType | 'all'>('all');

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const wine = await searchWine(q.trim());
      if (wine) {
        setResults(prev => [wine, ...prev]);
        toast.success(`Found: ${wine.name}`);
      } else {
        toast.error('No results found');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const filtered = activeFilter === 'all'
    ? results
    : results.filter(w => w.type === activeFilter);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Search bar — 48px height, 16px font */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-light/50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search wines, regions, grapes..."
          className="w-full pl-12 pr-20 py-3.5 rounded-2xl border border-cream-dark bg-white text-charcoal placeholder-charcoal-light/40 focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all shadow-sm"
          style={{ fontSize: '16px', minHeight: '48px' }}
        />
        <button
          onClick={() => handleSearch()}
          disabled={searching}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-burgundy text-cream px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-burgundy-light transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {searching ? '...' : 'Search'}
        </button>
      </div>

      {/* Filter chips — 44px touch targets */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {filterChips.map(chip => (
          <button
            key={chip.value}
            onClick={() => setActiveFilter(chip.value)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 min-h-[44px] ${
              activeFilter === chip.value
                ? 'bg-burgundy text-cream shadow-sm'
                : 'bg-white border border-cream-dark text-charcoal-light hover:border-burgundy/30'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {searching && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-md">
            <div className="w-8 h-8 border-2 border-burgundy/20 border-t-burgundy rounded-full animate-spin" />
            <span className="text-sm text-charcoal-light font-medium">Searching with AI...</span>
          </div>
        </div>
      )}

      {/* Results — responsive grid on desktop */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-charcoal-light">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(wine => (
              <WineCard key={wine.id} wine={wine} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && (
        <div className="text-center py-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-burgundy/10 to-gold/10 flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="font-semibold text-burgundy text-lg mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Discover Wines
          </h3>
          <p className="text-charcoal-light text-sm mb-6 max-w-xs mx-auto">
            Search any wine by name, region, or grape variety and get AI-powered details
          </p>

          {/* Popular searches — 44px touch targets */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-charcoal-light/60 uppercase tracking-wider">Popular searches</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Château Margaux', 'Opus One', 'Tignanello', 'Malbec Argentina', 'Barolo', 'Champagne Brut'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setQuery(suggestion); handleSearch(suggestion); }}
                  className="text-xs font-medium bg-white border border-cream-dark text-charcoal px-4 py-3 rounded-full hover:bg-burgundy hover:text-cream hover:border-burgundy transition-all duration-200 min-h-[44px]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
