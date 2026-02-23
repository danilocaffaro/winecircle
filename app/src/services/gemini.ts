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
    - name: string (full wine name)
    - producer: string (winery/producer)
    - region: string (wine region)
    - country: string
    - grape: string (grape variety/varieties)
    - year: number (vintage year, or null if unknown)
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
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const prompt = `Suggest 5 wine names that match or are similar to "${query}". Return ONLY a JSON array of strings. No markdown.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}
