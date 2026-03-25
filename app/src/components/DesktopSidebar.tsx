import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const sidebarItems = [
  { to: '/',        label: 'Home',     icon: 'home' },
  { to: '/search',  label: 'Discover', icon: 'search' },
  { to: '/clubs',   label: 'My Clubs', icon: 'group' },
  { to: '/profile', label: 'Profile',  icon: 'person' },
];

export const DesktopSidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <aside
      className="hidden md:flex flex-col w-60 lg:w-64 min-h-screen sticky top-0 shrink-0"
      style={{
        background: 'var(--md-surface-container-low)',
        borderRight: '1px solid var(--md-outline-variant)',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 pb-4">
        <Link to="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--md-primary)' }}
          >
            <span
              className="material-symbols-rounded ms-filled"
              style={{ fontSize: 20, color: 'var(--md-on-primary)' }}
            >
              wine_bar
            </span>
          </div>
          <h1
            className="text-xl font-semibold"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}
          >
            Wine Circle
          </h1>
        </Link>
      </div>

      {/* Nav items — MD3 Navigation Drawer style */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {sidebarItems.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 16px',
                height: 56,
                borderRadius: 'var(--shape-full)',
                background: active ? 'var(--md-secondary-container)' : 'transparent',
                color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                letterSpacing: '0.1px',
                textDecoration: 'none',
                transition: 'background var(--motion-duration-short2)',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background =
                  'color-mix(in srgb, var(--md-on-surface-variant) 8%, transparent)';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span
                className="material-symbols-rounded"
                style={{
                  fontSize: 24,
                  fontVariationSettings: active
                    ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--md-primary-container)' }}
          >
            <span
              className="material-symbols-rounded ms-filled"
              style={{ fontSize: 16, color: 'var(--md-on-primary-container)' }}
            >
              person
            </span>
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--md-on-surface)' }}>Wine Enthusiast</p>
            <p className="text-[10px]" style={{ color: 'var(--md-on-surface-variant)' }}>Wine Circle v10.1</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
