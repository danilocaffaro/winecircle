import React from 'react';
import { Link } from 'react-router-dom';
import { getClubs, getEvents } from '../services/storage';

export const Home: React.FC = () => {
  const clubs = getClubs();
  const events = getEvents();
  const recentEvents = events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const isEmpty = clubs.length === 0 && events.length === 0;
  const completedCount = events.filter(e => e.status === 'completed').length;
  const totalWines = events.reduce((sum, e) => sum + e.wines.length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-charcoal-light text-sm">Welcome back</p>
        <h1 className="text-[26px] font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          Wine Circle
        </h1>
      </div>

      {isEmpty ? (
        /* ─── Empty State ─── */
        <div className="space-y-6">
          {/* Hero card */}
          <div className="relative overflow-hidden rounded-2xl shadow-xl">
            <div className="wine-gradient-red px-8 pt-8 pb-12 sm:px-10 sm:pt-10 sm:pb-14 text-center">
              <div className="absolute inset-0 opacity-[0.06]" style={{
                backgroundImage: 'radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)',
                backgroundSize: '24px 24px, 32px 32px'
              }} />
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-5xl">🥂</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Your Wine Journey Starts Here
                </h2>
                <p className="text-white/70 text-sm mb-5 max-w-sm mx-auto">
                  Create a wine club, host blind tastings with friends, and discover amazing wines together.
                </p>
                <Link
                  to="/clubs/new"
                  className="bg-white text-burgundy px-8 py-3.5 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all min-h-[48px] inline-flex items-center justify-center"
                >
                  Create Your First Club
                </Link>
              </div>
            </div>
          </div>

          {/* Features — responsive 3-col */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: '🏛️', title: 'Clubs', desc: 'Organize your community' },
              { icon: '🙈', title: 'Blind Tasting', desc: 'Fair & unbiased' },
              { icon: '💰', title: 'Split Bills', desc: 'Auto-calculated' },
            ].map(feat => (
              <div key={feat.title} className="bg-white rounded-2xl p-4 sm:p-5 border border-cream-dark text-center shadow-sm">
                <span className="text-2xl block mb-2">{feat.icon}</span>
                <h3 className="text-sm font-semibold text-burgundy">{feat.title}</h3>
                <p className="text-xs text-charcoal-light mt-1">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-charcoal-light uppercase tracking-wider">How it works</h2>
            {[
              { step: '1', emoji: '✨', text: 'Create a club and invite friends' },
              { step: '2', emoji: '🍷', text: 'Add wines and start a blind tasting' },
              { step: '3', emoji: '🏆', text: 'Rank wines and reveal the winner!' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-cream-dark">
                <div className="w-10 h-10 rounded-full bg-burgundy text-cream flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <p className="text-sm text-charcoal">
                  <span className="mr-1">{item.emoji}</span>{item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Discover Wines Preview */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-charcoal-light uppercase tracking-wider">Discover Wines</h2>
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {['All', 'Red', 'White', 'Rosé', 'Sparkling'].map((type, i) => (
                <span
                  key={type}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all min-h-[44px] flex items-center ${
                    i === 0
                      ? 'bg-burgundy text-cream border-burgundy'
                      : 'bg-white text-charcoal-light border-cream-dark'
                  }`}
                >
                  {type}
                </span>
              ))}
            </div>
            {/* Sample Wine Cards — responsive grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Château Margaux 2018', type: 'Red', region: 'Bordeaux, France', grape: 'Cabernet Sauvignon', rating: 4.6, ratingCount: 2840, price: 'R$ 1.250', body: 85, sweetness: 15, tannin: 78, color: '#722F37' },
              { name: 'Cloudy Bay 2023', type: 'White', region: 'Marlborough, NZ', grape: 'Sauvignon Blanc', rating: 4.2, ratingCount: 1560, price: 'R$ 189', body: 30, sweetness: 25, tannin: 10, color: '#C5A84F' },
            ].map((wine, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark flex gap-4">
                {/* Bottle silhouette */}
                <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${wine.color}15` }}>
                  <svg width="28" height="60" viewBox="0 0 28 60" fill={wine.color} opacity="0.5">
                    <path d="M11 0h6v12c3 2 6 6 6 14v26c0 4-3 8-9 8s-9-4-9-8V26c0-8 3-12 6-14V0z"/>
                  </svg>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-burgundy text-sm sm:text-base truncate">{wine.name}</h3>
                      <p className="text-[11px] text-charcoal-light mt-1">{wine.region} · {wine.grape}</p>
                    </div>
                    {/* Rating badge — 44px touch target */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-2" style={{
                      borderColor: wine.rating >= 4.0 ? '#22c55e' : wine.rating >= 3.0 ? '#eab308' : '#ef4444',
                      background: wine.rating >= 4.0 ? '#22c55e10' : wine.rating >= 3.0 ? '#eab30810' : '#ef444410',
                    }}>
                      <span className="text-xs font-bold" style={{ color: wine.rating >= 4.0 ? '#22c55e' : wine.rating >= 3.0 ? '#eab308' : '#ef4444' }}>
                        {wine.rating}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${wine.color}15`, color: wine.color }}>
                      {wine.type}
                    </span>
                    <span className="text-xs font-bold text-burgundy">{wine.price}</span>
                    <span className="text-[10px] text-charcoal-light">({wine.ratingCount.toLocaleString()})</span>
                  </div>
                  {/* Taste profile bars — h-2.5 Vivino-style */}
                  <div className="mt-4 space-y-2.5">
                    {[
                      { label: 'Body', value: wine.body, left: 'Light', right: 'Bold' },
                      { label: 'Sweetness', value: wine.sweetness, left: 'Dry', right: 'Sweet' },
                      { label: 'Tannin', value: wine.tannin, left: 'Smooth', right: 'Tannic' },
                    ].map(bar => (
                      <div key={bar.label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[11px] font-medium text-charcoal-light">{bar.left}</span>
                          <span className="text-[11px] font-medium text-charcoal-light">{bar.right}</span>
                        </div>
                        <div className="h-2.5 bg-cream-dark rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${bar.value}%`, background: wine.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      ) : (
        /* ─── Active State ─── */
        <div className="space-y-6">
          {/* Quick actions — responsive */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/clubs/new"
              className="bg-burgundy text-cream rounded-2xl p-5 hover:bg-burgundy-light active:bg-burgundy-dark transition-all shadow-md min-h-[88px]"
            >
              <span className="text-xl block mb-1.5">✨</span>
              <span className="text-sm font-semibold">New Club</span>
              <p className="text-[11px] text-cream/60 mt-0.5">Start a tasting group</p>
            </Link>
            <Link
              to="/search"
              className="bg-white text-charcoal border border-cream-dark rounded-2xl p-5 hover:border-burgundy/30 transition-all shadow-sm min-h-[88px]"
            >
              <span className="text-xl block mb-1.5">🔍</span>
              <span className="text-sm font-semibold text-burgundy">Search Wines</span>
              <p className="text-[11px] text-charcoal-light mt-0.5">AI-powered discovery</p>
            </Link>
          </div>

          {/* Stats strip — responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Clubs', value: clubs.length, icon: '👥' },
              { label: 'Events', value: events.length, icon: '📅' },
              { label: 'Completed', value: completedCount, icon: '✅' },
              { label: 'Wines', value: totalWines, icon: '🍷' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-cream-dark">
                <span className="text-sm">{stat.icon}</span>
                <p className="text-xl font-bold text-burgundy leading-tight mt-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {stat.value}
                </p>
                <p className="text-[11px] text-charcoal-light mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* My Clubs */}
          {clubs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
                  My Clubs
                </h2>
                <Link to="/clubs" className="text-xs font-medium text-gold-dark hover:text-gold min-h-[44px] flex items-center">
                  See all →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {clubs.slice(0, 4).map(club => (
                  <Link
                    key={club.id}
                    to={`/clubs/${club.id}`}
                    className="min-w-[150px] bg-white rounded-2xl p-4 shadow-sm border border-cream-dark hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-burgundy/15 to-gold/10 flex items-center justify-center mb-2">
                      <span className="text-lg">🏛️</span>
                    </div>
                    <h3 className="font-semibold text-burgundy text-sm truncate">{club.name}</h3>
                    <p className="text-[11px] text-charcoal-light mt-0.5">{club.members.length} members</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-burgundy mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Recent Events
              </h2>
              <div className="space-y-3">
                {recentEvents.map(event => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-cream-dark hover:shadow-md transition-all"
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        event.status === 'completed' ? 'bg-green-50' :
                        event.status === 'tasting' ? 'bg-gold/10' : 'bg-cream'
                      }`}>
                        <span className="text-lg">
                          {event.status === 'completed' ? '🏆' : event.status === 'tasting' ? '🍷' : '📋'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-burgundy text-sm truncate">{event.name}</h3>
                        <p className="text-[11px] text-charcoal-light mt-0.5">
                          {new Date(event.date).toLocaleDateString('pt-BR')} · {event.wines.length} wines · {event.type === 'blind' ? '🙈 Blind' : '👀 Open'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full shrink-0 ${
                        event.status === 'completed' ? 'bg-green-50 text-green-700' :
                        event.status === 'tasting' ? 'bg-gold/15 text-gold-dark' :
                        'bg-cream-dark text-charcoal-light'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
