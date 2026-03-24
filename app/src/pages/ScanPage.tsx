import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { scanWineLabel } from '../services/gemini';
import { WineCard } from '../components/WineCard';
import type { Wine } from '../types';

export const ScanPage: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Wine | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setScanning(true);
      setResult(null);
      try {
        const base64 = dataUrl.split(',')[1];
        const wine = await scanWineLabel(base64, file.type);
        if (wine) {
          setResult(wine);
          toast.success(`Found: ${wine.name} 🍷`);
        } else {
          toast.error('Could not identify the wine label');
        }
      } catch {
        toast.error('Scan failed. Check your connection.');
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  const reset = () => { setResult(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-6">
      <div>
        <h1 className="text-2xl font-bold text-burgundy" style={{ fontFamily: 'Playfair Display, serif' }}>
          📷 Scan Label
        </h1>
        <p className="text-sm text-charcoal-muted mt-0.5">AI-powered wine label recognition</p>
      </div>

      {/* Upload zone */}
      {!result && (
        <div
          className={`card border-2 border-dashed transition-all cursor-pointer ${
            scanning ? 'border-burgundy/40 bg-burgundy/5' : 'border-cream-darker hover:border-burgundy/40 hover:bg-burgundy/5'
          }`}
          style={{ borderColor: scanning ? 'var(--burgundy)' : undefined }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !scanning && fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {preview ? (
            <div className="p-3">
              <img
                src={preview}
                alt="Wine label"
                className="w-full max-h-64 object-contain rounded-xl mb-4"
              />
              {scanning && (
                <div className="flex items-center justify-center gap-3 py-3">
                  <div className="w-6 h-6 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" />
                  <span className="text-sm text-charcoal-muted font-medium">Analyzing with AI...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center">
              {/* Viewfinder */}
              <div className="relative w-40 h-40 mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-burgundy/20" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-burgundy/50 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-burgundy/50 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-burgundy/50 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-burgundy/50 rounded-br-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-burgundy/8 flex items-center justify-center">
                    <span className="text-4xl">📷</span>
                  </div>
                </div>
              </div>
              <h2 className="text-lg font-bold text-burgundy mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Scan a Wine Label
              </h2>
              <p className="text-charcoal-muted text-sm mb-5">
                Take a photo or upload from your gallery.<br />
                AI will identify the wine instantly.
              </p>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <button className="btn-primary">
                  📷 Take Photo
                </button>
                <button className="btn-ghost">
                  🖼️ Upload from Gallery
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4 fade-in">
          <div className="flex items-center justify-between">
            <span className="section-label">Identified Wine</span>
            <button onClick={reset} className="text-xs text-charcoal-muted hover:text-burgundy font-medium transition-colors">
              Scan another
            </button>
          </div>
          {preview && (
            <img src={preview} alt="Scanned label" className="w-full max-h-48 object-contain rounded-2xl border border-cream-dark" />
          )}
          <WineCard wine={result} />
        </div>
      )}

      {/* Search fallback */}
      <div className="text-center pt-2">
        <p className="text-xs text-charcoal-muted mb-2">Don't have the bottle nearby?</p>
        <Link to="/search" className="text-sm text-burgundy font-semibold hover:underline underline-offset-2">
          Search by name instead →
        </Link>
      </div>
    </div>
  );
};
