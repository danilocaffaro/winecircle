import React from 'react';
import { Link } from 'react-router-dom';

export const ScanPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 max-w-lg mx-auto">
      {/* Camera viewfinder illustration */}
      <div className="relative w-56 h-56 mb-8">
        <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-burgundy/20" />
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-10 h-10 border-t-3 border-l-3 border-burgundy/30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-10 h-10 border-t-3 border-r-3 border-burgundy/30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-3 border-l-3 border-burgundy/30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-3 border-r-3 border-burgundy/30 rounded-br-xl" />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-burgundy/10 to-burgundy/5 flex items-center justify-center">
            <span className="text-5xl">📷</span>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-burgundy mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        Scan a Wine Label
      </h1>

      <div className="space-y-4 w-full max-w-xs">
        {/* Coming soon badge — prominent */}
        <div className="bg-cream-dark border border-cream-dark rounded-2xl py-4 px-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-lg">📷</span>
            <span className="text-base font-semibold text-charcoal">Coming Soon</span>
          </div>
          <p className="text-charcoal-light text-xs">
            Camera scanning is under development. You'll be able to point at any wine label and get instant details.
          </p>
        </div>

        {/* Active CTA — search */}
        <Link
          to="/search"
          className="w-full bg-burgundy text-cream py-3.5 rounded-2xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-lg min-h-[48px] flex items-center justify-center gap-2"
        >
          <span>🔍</span>
          Search by name instead
        </Link>
      </div>
    </div>
  );
};
