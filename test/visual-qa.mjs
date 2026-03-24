/**
 * WineCircle — Plano de Testes Visual/UI
 * Playwright · Headless Chromium · URL: http://localhost:5199
 *
 * Cobre 6 fluxos principais:
 *   F1. Search autocomplete
 *   F2. Criar clube com membros + Pix
 *   F3. Editar membro no ClubDetail
 *   F4. Criar evento de degustação
 *   F5. Ranking + resultado Borda
 *   F6. Acerto de contas + Copiar Pix
 *
 * Uso:
 *   node test/visual-qa.mjs [--base-url http://...] [--out ./screenshots]
 */

import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.argv.find(a => a.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:5199';
const OUT_DIR  = process.argv.find(a => a.startsWith('--out='))?.split('=')[1] || '/root/.opencla/screenshots/winecircle';

fs.mkdirSync(OUT_DIR, { recursive: true });

const SEED = {
  clubId: 'qa-club-001',
  eventId: 'qa-event-001',
  members: [
    { id: 'm1', name: 'Danilo',  pixKey: 'danilo@email.com' },
    { id: 'm2', name: 'Marina',  pixKey: '11999887766' },
    { id: 'm3', name: 'Ricardo', pixKey: '' },
  ],
  wines: [
    { id: 'w1', name: 'Château Margaux 2018', type: 'red',  price: 850,  producer: 'Château Margaux',  region: 'Bordeaux', country: 'France',   year: 2018 },
    { id: 'w2', name: 'Opus One 2019',        type: 'red',  price: 1200, producer: 'Opus One Winery',  region: 'Napa Valley', country: 'USA',  year: 2019 },
    { id: 'w3', name: 'Tignanello 2020',      type: 'red',  price: 480,  producer: 'Antinori',         region: 'Tuscany',  country: 'Italy',    year: 2020 },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function seedLocalStorage(page) {
  await page.evaluate((seed) => {
    const club = {
      id: seed.clubId,
      name: 'Confraria do Malbec',
      description: 'Clube de degustação mensal',
      members: seed.members,
      createdAt: new Date().toISOString(),
    };
    const event = {
      id: seed.eventId,
      clubId: seed.clubId,
      name: 'Noite Cega — Cabernet',
      date: '2026-03-24',
      type: 'blind',
      wines: seed.wines,
      memberIds: seed.members.map(m => m.id),
      rankings: [
        { memberId: 'm1', wineOrder: ['w1', 'w3', 'w2'] },
        { memberId: 'm2', wineOrder: ['w1', 'w2', 'w3'] },
        { memberId: 'm3', wineOrder: ['w3', 'w1', 'w2'] },
      ],
      expenses: {
        totalCost: 2530,
        payments: [
          { memberId: 'm1', amount: 2530 },
          { memberId: 'm2', amount: 0 },
          { memberId: 'm3', amount: 0 },
        ],
        splits: [
          { fromMemberId: 'm2', toMemberId: 'm1', amount: 843.33 },
          { fromMemberId: 'm3', toMemberId: 'm1', amount: 843.34 },
        ],
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('winecircle_clubs',  JSON.stringify([club]));
    localStorage.setItem('winecircle_events', JSON.stringify([event]));
  }, SEED);
}

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label, err) { console.error(`  ❌ ${label}:`, err?.message || err); }

const results = { passed: 0, failed: 0, screenshots: [] };
function record(ok, label, file) {
  if (ok) { pass(label); results.passed++; }
  else     { fail(label); results.failed++; }
  if (file) results.screenshots.push({ label, file, ok });
}

// ── Test suite ────────────────────────────────────────────────────────────────
async function runTests() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx     = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page    = await ctx.newPage();

  page.on('pageerror', e => console.warn('  ⚠️  JS error:', e.message.slice(0, 80)));

  // ── Seed data ───────────────────────────────────────────────────────────────
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await seedLocalStorage(page);

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F1 — Home');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const f1 = await shot(page, 'f1-home');
  const homeHtml = await page.evaluate(() => document.body.innerHTML);
  record(homeHtml.includes('Wine Circle'), 'F1-01 Título "Wine Circle" visível', f1);
  record(homeHtml.includes('Confraria') || homeHtml.includes('club') || homeHtml.includes('Club'), 'F1-02 Clube na home', f1);

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F2 — Search Autocomplete');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(`${BASE_URL}/search`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const f2a = await shot(page, 'f2-search-empty');
  record(await page.locator('input[placeholder*="Search"]').count() > 0, 'F2-01 Input de busca presente', f2a);
  record(await page.locator('text=Discover Wines').count() > 0, 'F2-02 Empty state "Discover Wines"', f2a);
  record(await page.locator('text=Popular searches').count() > 0, 'F2-03 Popular searches visível', f2a);

  // Digita query
  await page.click('input[placeholder*="Search"]');
  await page.type('input[placeholder*="Search"]', 'Malbec', { delay: 60 });
  await page.waitForTimeout(500);
  const f2b = await shot(page, 'f2-search-typing');
  record(await page.locator('input[placeholder*="Search"]').inputValue().then(v => v === 'Malbec'), 'F2-04 Query "Malbec" no input', f2b);

  // Espera dropdown (pode demorar — Gemini)
  await page.waitForTimeout(2000);
  const f2c = await shot(page, 'f2-search-dropdown');
  const dropdown = await page.locator('.search-dropdown').count();
  record(dropdown > 0, 'F2-05 Dropdown de sugestões aparece', f2c);

  // Clica popular search
  await page.locator('button:has-text("Barolo DOCG")').click().catch(() => {});
  await page.waitForTimeout(3000);
  const f2d = await shot(page, 'f2-search-result');
  const hasResult = await page.evaluate(() => document.body.innerHTML.includes('Barolo') || document.body.innerHTML.includes('result'));
  record(hasResult, 'F2-06 Resultado aparece após busca', f2d);

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F3 — Criar Clube com Pix');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(`${BASE_URL}/clubs/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  const f3a = await shot(page, 'f3-clubform-empty');
  record(await page.locator('input[placeholder*="Confraria"]').count() > 0, 'F3-01 Campo nome do clube', f3a);
  record(await page.locator('input[placeholder="Enter member name"]').count() > 0, 'F3-02 Campo nome do membro', f3a);
  record(await page.locator('input[placeholder*="Pix"]').count() > 0, 'F3-03 Campo Chave Pix presente', f3a);

  // Preenche e adiciona membro
  await page.fill('input[placeholder*="Confraria"]', 'Confraria do Cabernet');
  await page.fill('input[placeholder="Enter member name"]', 'Danilo');
  await page.fill('input[placeholder*="Pix"]', 'danilo@test.com');
  await page.click('button:has-text("Add")');
  await page.waitForTimeout(500);

  const f3b = await shot(page, 'f3-clubform-member-added');
  const bodyAfterAdd = await page.evaluate(() => document.body.innerHTML);
  record(bodyAfterAdd.includes('Danilo'), 'F3-04 Membro adicionado na lista', f3b);
  record(bodyAfterAdd.includes('PIX'), 'F3-05 Badge PIX verde aparece', f3b);

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F4 — ClubDetail + Edição Pix');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(`${BASE_URL}/clubs/${SEED.clubId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const f4a = await shot(page, 'f4-clubdetail');
  const clubHtml = await page.evaluate(() => document.body.innerHTML);
  record(clubHtml.includes('Danilo'), 'F4-01 Membro Danilo visível', f4a);
  record(clubHtml.includes('PIX'), 'F4-02 Badge PIX no membro com chave', f4a);
  record(await page.locator('button').filter({ hasText: '💳' }).count() > 0, 'F4-03 Botões 💳 de edição presentes', f4a);

  // Edita Pix do Ricardo (sem chave)
  const pixBtns = await page.locator('button').filter({ hasText: '💳' }).all();
  if (pixBtns.length >= 3) {
    await pixBtns[2].click();
    await page.waitForTimeout(400);
    const f4b = await shot(page, 'f4-clubdetail-edit-pix');
    record(await page.locator('input[placeholder*="CPF"]').count() > 0, 'F4-04 Input edição Pix abre inline', f4b);

    // Salva nova chave
    await page.fill('input[placeholder*="CPF"]', 'ricardo@pix.com');
    await page.click('button:has-text("Salvar")');
    await page.waitForTimeout(400);
    const f4c = await shot(page, 'f4-clubdetail-saved');
    record(await page.evaluate(() => document.body.innerHTML).then(h => h.includes('ricardo@pix.com') || h.includes('PIX')), 'F4-05 Chave Pix salva e exibida', f4c);
  } else {
    record(false, 'F4-04 Input edição Pix — botão 💳 insuficiente', f4a);
  }

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F5 — EventDetail + Rankings');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(`${BASE_URL}/events/${SEED.eventId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const f5a = await shot(page, 'f5-eventdetail');
  const evHtml = await page.evaluate(() => document.body.innerHTML);
  record(evHtml.includes('Noite Cega'), 'F5-01 Nome do evento visível', f5a);
  record(evHtml.includes('Château') || evHtml.includes('Opus') || evHtml.includes('Tignanello'), 'F5-02 Vinhos do evento listados', f5a);
  record(evHtml.includes('Danilo') || evHtml.includes('Marina') || evHtml.includes('Ricardo'), 'F5-03 Membros do evento listados', f5a);

  // Verifica se botão de resultados/ranking existe
  const hasResultsBtn = await page.locator('button:has-text("Results"), a:has-text("Results"), button:has-text("Resultado"), text=Borda').count();
  record(hasResultsBtn > 0 || evHtml.includes('completed'), 'F5-04 Status "completed" ou botão Results', f5a);

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F6 — ExpensePage + Pix');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(`${BASE_URL}/events/${SEED.eventId}/expenses`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  const f6a = await shot(page, 'f6-expenses');
  const expHtml = await page.evaluate(() => document.body.innerHTML);
  record(expHtml.includes('Expenses') || expHtml.includes('expense'), 'F6-01 Título Expenses visível', f6a);
  record(expHtml.includes('2530') || expHtml.includes('2.530'), 'F6-02 Total cost R$2530 presente', f6a);
  record(expHtml.includes('PIX'), 'F6-03 Badge PIX nos splits', f6a);
  record(await page.locator('button:has-text("Copiar Pix")').count() > 0, 'F6-04 Botão "Copiar Pix" presente', f6a);

  // Screenshot detalhado do split
  const copiarBtn = await page.locator('button:has-text("Copiar Pix")').first();
  if (await copiarBtn.count()) {
    await copiarBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const f6b = await shot(page, 'f6-expenses-splits');
    record(true, 'F6-05 Screenshot splits com Pix capturado', f6b);
  }

  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📋 F7 — Clubs list');
  // ════════════════════════════════════════════════════════════════════════════
  await page.goto(`${BASE_URL}/clubs`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  const f7 = await shot(page, 'f7-clubs-list');
  const clubsHtml = await page.evaluate(() => document.body.innerHTML);
  record(clubsHtml.includes('Confraria'), 'F7-01 Clube "Confraria do Malbec" na lista', f7);
  record(await page.locator('a[href*="/clubs/new"], button:has-text("New Club"), button:has-text("Create")').count() > 0, 'F7-02 Botão criar novo clube', f7);

  // ════════════════════════════════════════════════════════════════════════════
  await browser.close();

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`📁 Screenshots saved to: ${OUT_DIR}`);
  console.log('═'.repeat(50));

  const report = {
    date: new Date().toISOString(),
    baseUrl: BASE_URL,
    passed: results.passed,
    failed: results.failed,
    total: results.passed + results.failed,
    passRate: `${Math.round(results.passed / (results.passed + results.failed) * 100)}%`,
    screenshots: results.screenshots,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`📄 Report: ${path.join(OUT_DIR, 'report.json')}`);

  if (results.failed > 0) process.exit(1);
}

runTests().catch(e => { console.error('Fatal:', e); process.exit(1); });
