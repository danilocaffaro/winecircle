import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const sidebarItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/search', label: 'Discover', icon: '🔍' },
  { to: '/scan', label: 'Scan Wine', icon: '📷' },
  { to: '/wines', label: 'My Wines', icon: '🍷' },
  { to: '/clubs', label: 'My Clubs', icon: '👥' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export const DesktopSidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 bg-white border-r border-cream-dark min-h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-cream-dark">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl wine-gradient-red flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">W</span>
          </div>
          <h1 className="text-xl font-bold text-burgundy tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Wine Circle
          </h1>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-burgundy/5 text-burgundy font-semibold border-l-[3px] border-burgundy pl-3.5'
                  : 'text-charcoal-light hover:bg-cream hover:text-charcoal border-l-[3px] border-transparent pl-3.5'
              }`}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-cream-dark">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-burgundy to-burgundy-dark flex items-center justify-center">
            <span className="text-sm text-cream">🍷</span>
          </div>
          <div>
            <p className="text-xs font-medium text-charcoal">Wine Enthusiast</p>
            <p className="text-[10px] text-charcoal-light">Wine Circle v10.1</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
