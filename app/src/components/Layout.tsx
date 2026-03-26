import React from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--md-background)" }}>
      {/* Mobile Header — fixed no topo, não sticky dentro de flex */}
      <header
        className="w-full md:hidden safe-area-top" style={{ background: "var(--md-surface)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--md-outline-variant)", position: "fixed", top: 0, left: 0, right: 0, zIndex: 200 }}
      >
        <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-between safe-area-x">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg wine-gradient-red flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Playfair Display, serif", color: "var(--md-on-surface)" }}>
              Wine Circle
            </h1>
          </Link>
          <Link
            to="/clubs"
            className="p-2 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--md-on-surface-variant)' }}
            aria-label="My Clubs"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar + content row */}
      <div className="flex flex-1">
        <DesktopSidebar />

        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {/* Desktop Header */}
          <header className="hidden md:block w-full sticky top-0 z-50" style={{ background: "var(--md-surface)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--md-outline-variant)" }}>
            <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
              <div />
              <Link
                to="/clubs"
                className="px-3 py-2 rounded-xl transition-colors text-sm font-medium flex items-center gap-2"
                style={{ color: 'var(--md-on-surface-variant)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                My Clubs
              </Link>
            </div>
          </header>

          {/* Main Content — paddingTop compensa header fixed, paddingBottom compensa navbar */}
          <main
            className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 py-5 md:pb-8 safe-area-x"
            style={{
              paddingTop: 'calc(48px + env(safe-area-inset-top, 0px) + 16px)',
              paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px) + 24px)',
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Navigation — mobile only */}
      <BottomNav />
    </div>
  );
};
