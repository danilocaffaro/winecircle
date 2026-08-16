import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: string;       // Material Symbol name
  iconFilled: string; // filled variant
}

const navItems: NavItem[] = [
  { to: '/',       label: 'Início',     icon: 'home',       iconFilled: 'home' },
  { to: '/clubs',  label: 'Clubes',    icon: 'group',      iconFilled: 'group' },
  { to: '/profile',label: 'Perfil',  icon: 'person',     iconFilled: 'person' },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden safe-area-bottom"
      style={{
        background: 'var(--md-surface)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--md-outline-variant)',
        zIndex: 200,
      }}
    >
      <div
        className="max-w-xl mx-auto flex items-center"
        style={{ height: 80 }}
      >
        {navItems.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex-1 flex flex-col items-center justify-center gap-1"
              style={{ minHeight: 80, textDecoration: 'none' }}
              aria-label={item.label}
            >
              {/* Pill indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 32,
                  borderRadius: 'var(--shape-full)',
                  background: active ? 'var(--md-secondary-container)' : 'transparent',
                  transition: 'background var(--motion-duration-medium1) var(--motion-easing-emphasized)',
                }}
              >
                <span
                  className="material-symbols-rounded"
                  style={{
                    fontSize: 24,
                    color: active ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant)',
                    fontVariationSettings: active
                      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                      : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                    transition: 'color var(--motion-duration-short4), font-variation-settings var(--motion-duration-short4)',
                  }}
                >
                  {item.icon}
                </span>
              </div>
              {/* Label */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  lineHeight: '16px',
                  color: active ? 'var(--md-on-surface)' : 'var(--md-on-surface-variant)',
                  transition: 'color var(--motion-duration-short4)',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
