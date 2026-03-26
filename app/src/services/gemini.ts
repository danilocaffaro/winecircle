import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Wine } from '../types';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const genAI = new GoogleGenerativeAI(API_KEY);

export async function searchWine(query: string): Promise<Wine | null> {
  if (!API_KEY) {
    console.error('VITE_GEMINI_API_KEY not configured');
    throw new Error('AI search not configured. Please set VITE_GEMINI_API_KEY.');
  }
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `You are a wine expert. Given the wine query "${query}", return a JSON object with these fields:
    - name: string (full wine name INCLUDING vintage year, e.g. "Opus One 2019" not just "Opus One")
    - producer: string (winery/producer)
    - region: string (wine region)
    - country: string
    - grape: string (grape variety/varieties)
    - year: number (vintage year — REQUIRED, use most recent notable vintage if not specified)
    - tastingNotes: string (brief tasting notes, 2-3 sentences)
    - type: string (one of: "red", "white", "rosé", "sparkling", "dessert", "orange")
    - price: number (approximate price in BRL, or null)
    - rating: number (typical rating 1.0-5.0 on wine apps, or null)
    - ratingCount: number (approximate number of ratings, or null)
    - tasteProfile: object with:
      - body: number (0-100, 0=very light, 100=very bold)
      - sweetness: number (0-100, 0=bone dry, 100=very sweet)
      - tannin: number (0-100, 0=very smooth, 100=very tannic)
      - acidity: number (0-100, 0=soft, 100=high acidity)
    
    IMPORTANT: The vintage year is like the wine's surname — always include it.
    Return ONLY valid JSON, no markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    return {
      id: uuidv4(),
      name: data.name || query,
      producer: data.producer,
      region: data.region,
      country: data.country,
      grape: data.grape,
      year: data.year,
      tastingNotes: data.tastingNotes,
      type: data.type || 'red',
      price: data.price || undefined,
      rating: data.rating || undefined,
      ratingCount: data.ratingCount || undefined,
      tasteProfile: data.tasteProfile || undefined,
    };
  } catch (error) {
    console.error('Gemini search error:', error);
    return null;
  }
}

export async function getWineSuggestions(query: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: MODEL });
  const prompt = `Given the wine search query "${query}", suggest exactly 5 real wine names with vintage year (e.g. "Opus One 2019", "Château Margaux 2015") that START WITH or CONTAIN this text. Prioritize exact prefix matches first, then close matches. Always include the vintage year. Return ONLY a JSON array of strings. No markdown, no explanation.`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

export async function scanWineLabel(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<Wine | null> {
  if (!API_KEY) throw new Error('AI not configured');
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `You are a wine expert analyzing a wine label photo. Extract all visible information and return a JSON object with:
    - name: string (full wine name)
    - producer: string (winery/producer)
    - region: string
    - country: string
    - grape: string
    - year: number or null
    - tastingNotes: string (2-3 sentences based on your wine knowledge)
    - type: "red"|"white"|"rosé"|"sparkling"|"dessert"|"orange"
    - price: number in BRL approximate or null
    - rating: number 1.0-5.0 or null
    - tasteProfile: { body: 0-100, sweetness: 0-100, tannin: 0-100, acidity: 0-100 }
    Return ONLY valid JSON.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType } }
    ]);
    const text = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(text);
    return {
      id: uuidv4(),
      name: data.name || 'Unknown Wine',
      producer: data.producer,
      region: data.region,
      country: data.country,
      grape: data.grape,
      year: data.year,
      tastingNotes: data.tastingNotes,
      type: data.type || 'red',
      price: data.price || undefined,
      rating: data.rating || undefined,
      tasteProfile: data.tasteProfile || undefined,
    };
  } catch (error) {
    console.error('Scan error:', error);
    return null;
  }
}
