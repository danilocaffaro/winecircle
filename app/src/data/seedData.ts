import type { Wine } from '../types';

/* ── Curated seed wines for "never empty" UX ──
   Real wines with real data — shown when user has no search results
   or as editorial content on Home/Discover.
   Photos from Unsplash (free license). */

export const SEED_WINES: Wine[] = [
  {
    id: 'seed-1',
    name: 'Château Margaux 2015',
    type: 'red',
    region: 'Bordeaux, France',
    grape: 'Cabernet Sauvignon blend',
    year: 2015,
    rating: 97,
    description: 'Elegant and powerful, with notes of blackcurrant, violet, and cedar. One of the greatest vintages of the decade.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-2',
    name: 'Catena Zapata Malbec 2019',
    type: 'red',
    region: 'Mendoza, Argentina',
    grape: 'Malbec',
    year: 2019,
    rating: 93,
    description: 'Deep purple with explosive aromas of plum, dark chocolate, and a hint of violet. Velvety tannins.',
    imageUrl: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-3',
    name: 'Cloudy Bay Sauvignon Blanc 2022',
    type: 'white',
    region: 'Marlborough, New Zealand',
    grape: 'Sauvignon Blanc',
    year: 2022,
    rating: 91,
    description: 'Vibrant citrus and passion fruit, with a mineral finish that lingers. Quintessential New Zealand.',
    imageUrl: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-4',
    name: 'Tignanello 2018',
    type: 'red',
    region: 'Tuscany, Italy',
    grape: 'Sangiovese / Cabernet Sauvignon',
    year: 2018,
    rating: 95,
    description: 'The original Super Tuscan. Cherry, leather, and tobacco with incredible structure and length.',
    imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-5',
    name: 'Dom Pérignon 2012',
    type: 'sparkling',
    region: 'Champagne, France',
    grape: 'Chardonnay / Pinot Noir',
    year: 2012,
    rating: 96,
    description: 'Precise and luminous. White flowers, citrus zest, and a breathtaking mousse. Timeless elegance.',
    imageUrl: 'https://images.unsplash.com/photo-1578911373434-0cb395d2cbfb?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-6',
    name: 'Whispering Angel Rosé 2023',
    type: 'rosé',
    region: 'Provence, France',
    grape: 'Grenache / Cinsault / Rolle',
    year: 2023,
    rating: 89,
    description: 'Pale salmon pink. Fresh strawberry, peach, and a hint of cream. The benchmark Provence rosé.',
    imageUrl: 'https://images.unsplash.com/photo-1566995541428-f2246c17cda1?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-7',
    name: 'Penfolds Grange 2017',
    type: 'red',
    region: 'South Australia',
    grape: 'Shiraz',
    year: 2017,
    rating: 98,
    description: 'Australia\'s most iconic wine. Dark fruit, anise, and chocolate. Monumental depth and aging potential.',
    imageUrl: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-8',
    name: 'Opus One 2019',
    type: 'red',
    region: 'Napa Valley, USA',
    grape: 'Cabernet Sauvignon blend',
    year: 2019,
    rating: 96,
    description: 'The Franco-American dream. Cassis, graphite, and espresso. Impeccable balance and silk-like tannins.',
    imageUrl: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-9',
    name: 'Riesling Spätlese 2021',
    type: 'dessert',
    region: 'Mosel, Germany',
    grape: 'Riesling',
    year: 2021,
    rating: 92,
    description: 'Honeyed apricot and slate minerality. Off-dry with electric acidity that cuts through the sweetness.',
    imageUrl: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-10',
    name: 'Barolo Monfortino 2016',
    type: 'red',
    region: 'Piedmont, Italy',
    grape: 'Nebbiolo',
    year: 2016,
    rating: 99,
    description: 'Rose petal, tar, and truffle. Nebbiolo at its most profound — a wine that demands patience and rewards it tenfold.',
    imageUrl: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-11',
    name: 'Casa Lapostolle Clos Apalta 2018',
    type: 'red',
    region: 'Colchagua Valley, Chile',
    grape: 'Carmenère / Cabernet Sauvignon / Merlot',
    year: 2018,
    rating: 94,
    description: 'A Chilean icon. Black fruit, smoked herbs, and fine-grained tannins in a voluptuous frame.',
    imageUrl: 'https://images.unsplash.com/photo-1516594915307-8f71568f218e?w=400&h=400&fit=crop',
  },
  {
    id: 'seed-12',
    name: 'Quinta do Noval Nacional 2017',
    type: 'red',
    region: 'Douro Valley, Portugal',
    grape: 'Touriga Nacional / Touriga Franca',
    year: 2017,
    rating: 97,
    description: 'From ungrafted pre-phylloxera vines. Intense dark fruit, slate, and wild herbs. Mythical rarity.',
    imageUrl: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=400&fit=crop',
  },
];

/* ── Trending this week (curated subset) ── */
export const TRENDING_WINES = SEED_WINES.filter(w =>
  ['seed-2', 'seed-4', 'seed-6', 'seed-8'].includes(w.id)
);

/* ── Staff picks ── */
export const STAFF_PICKS = SEED_WINES.filter(w =>
  ['seed-1', 'seed-5', 'seed-10', 'seed-7'].includes(w.id)
);

/* ── Best under R$100 (conceptual) ── */
export const BUDGET_PICKS = SEED_WINES.filter(w =>
  ['seed-2', 'seed-3', 'seed-6', 'seed-9'].includes(w.id)
);

/* ── Suggested club templates ── */
export const CLUB_TEMPLATES = [
  {
    name: 'Friday Night Reds',
    description: 'Weekly blind tasting — each member brings a red under R$80',
    icon: 'local_fire_department',
    members: 6,
  },
  {
    name: 'Old World vs New World',
    description: 'Monthly battle: France & Italy vs Argentina & Chile',
    icon: 'public',
    members: 8,
  },
  {
    name: 'Beginners Welcome',
    description: 'No snobs, no rules — just tasting and learning together',
    icon: 'school',
    members: 4,
  },
  {
    name: 'Sparkling Society',
    description: 'Champagne, Cava, Prosecco — bubbles only',
    icon: 'bubble_chart',
    members: 5,
  },
];
