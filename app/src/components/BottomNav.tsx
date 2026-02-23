import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const HomeIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const SearchIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ScanIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

const WineIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 5h14l-1.405 8.434A2.25 2.25 0 0115.373 15.5H8.627a2.25 2.25 0 01-2.222-2.066L5 5z" />
  </svg>
);

const ProfileIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/scan', label: 'Scan', Icon: ScanIcon, isScan: true },
  { to: '/wines', label: 'My Wines', Icon: WineIcon },
  { to: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-cream-dark z-50 md:hidden">
      <div className="max-w-xl mx-auto flex items-end safe-area-bottom" style={{ height: '68px' }}>
        {navItems.map(item => {
          const active = isActive(item.to);
          if (item.isScan) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex-1 flex flex-col items-center justify-center relative -mt-4"
                aria-label={item.label}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                  active
                    ? 'bg-burgundy text-cream scale-105'
                    : 'bg-burgundy text-cream/90 hover:bg-burgundy-light'
                }`}>
                  <item.Icon active={active} />
                </div>
                <span className={`text-[10px] mt-1 ${active ? 'text-burgundy font-semibold' : 'text-charcoal-light font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] pb-1.5 pt-2 transition-colors relative ${
                active ? 'text-burgundy' : 'text-charcoal-light hover:text-burgundy/70'
              }`}
              aria-label={item.label}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-burgundy rounded-full" />
              )}
              <item.Icon active={active} />
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};
