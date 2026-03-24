export interface Member {
  id: string;
  name: string;
  email?: string;
  pixKey?: string;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: string;
}

export type WineType = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'orange';

export interface TasteProfile {
  body: number;      // 0-100: Light(0) → Bold(100)
  sweetness: number;  // 0-100: Dry(0) → Sweet(100)
  tannin: number;     // 0-100: Smooth(0) → Tannic(100)
  acidity: number;    // 0-100: Soft(0) → Acidic(100)
}

export interface Wine {
  id: string;
  name: string;
  producer?: string;
  region?: string;
  country?: string;
  grape?: string;
  year?: number;
  tastingNotes?: string;
  imageUrl?: string;
  type?: WineType;
  price?: number;
  rating?: number;       // 1.0-5.0
  ratingCount?: number;
  tasteProfile?: TasteProfile;
}

export type EventType = 'open' | 'blind';

export interface TastingEvent {
  id: string;
  clubId: string;
  name: string;
  date: string;
  type: EventType;
  wines: Wine[];
  memberIds: string[];
  rankings: MemberRanking[];
  expenses: ExpenseData | null;
  status: 'planning' | 'tasting' | 'completed';
  createdAt: string;
}

export interface WineTastingNote {
  aroma: string;
  palate: string;
  finish: string;
  rating: number; // 1-5 stars
}

export interface MemberRanking {
  memberId: string;
  wineOrder: string[]; // wine IDs in ranked order (index 0 = 1st place)
  notes?: Record<string, WineTastingNote>; // wineId → notes
}

export interface BordaResult {
  wineId: string;
  wine: Wine;
  totalPoints: number;
  rank: number;
}

export interface ExpenseData {
  totalCost: number;
  payments: Payment[];
  splits: ExpenseSplit[];
}

export interface Payment {
  memberId: string;
  amount: number;
}

export interface ExpenseSplit {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}
