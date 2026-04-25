/**
 * WineCircle — Deep Flow E2E Test
 * Complete: Register → Club → Event+Wines → Tasting → Results → Expenses
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const BASE = 'https://winecircle.melhor.dev';
const PB = `${BASE}/pb`;
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'qa-deep');
const VIEWPORT = { width: 430, height: 932 };
const ts = Date.now();

const USERS = [
  { email: `deep1-${ts}@test.example.com`, password: 'Deep2026!', name: 'Carlos Deep' },
  { email: `deep2-${ts}@test.example.com`, password: 'Deep2026!', name: 'Marina Deep' },
];

let pages = {}, browser, adminToken;
let clubId, eventId;
let results = { passed: 0, failed: 0, errors: [] };

function pass(t) { results.passed++; console.log(`  ✅ ${t}`); }
function fail(t, e) { results.failed++; results.errors.push({ t, e: String(e).slice(0, 200) }); console.log(`  ❌ ${t}: ${String(e).slice(0, 200)}`); }

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

async function pbApi(method, endpoint, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${PB}${endpoint}`, opts);
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

async function getAdminToken() {
  const res = await pbApi('POST', '/api/collections/_superusers/auth-with-password', {
    identity: 'admin@winecircle.local', password: 'REDACTED_PB_SUPERUSER_PASSWORD'
  });
  return res.data?.token;
}

async function registerAndLogin(user, label) {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'pt-BR' });
  const page = await context.newPage();
  
  // Register via API
  await pbApi('POST', '/api/collections/users/records', {
    email: user.email, password: user.password, passwordConfirm: user.password,
    display_name: user.name,
  });
  
  // Login via UI
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  
  // Fill login
  await page.locator('input[placeholder="you@example.com"]').fill(user.email);
  await page.locator('input[placeholder="At least 8 characters"]').fill(user.password);
  await page.locator('button:text("Sign In")').last().click();
  await page.waitForTimeout(3000);
  
  const onHome = !await page.locator('input[placeholder="you@example.com"]').isVisible().catch(() => false);
  if (onHome) pass(`${label} logged in`);
  else fail(`${label} login`, 'Still on auth');
  
  return page;
}

async function main() {
  console.log('\n🍷 WineCircle Deep Flow E2E\n');
  fs.rmSync(OUT, { recursive: true, force: true });
  browser = await chromium.launch({ headless: true });
  adminToken = await getAdminToken();
  
  // ─── Register both users ───
  console.log('📋 Phase 1: Users');
  pages.carlos = await registerAndLogin(USERS[0], 'Carlos');
  pages.marina = await registerAndLogin(USERS[1], 'Marina');
  
  // ─── Carlos creates club ───
  console.log('\n📋 Phase 2: Club');
  const p = pages.carlos;
  await p.goto(`${BASE}/clubs/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(1000);
  await p.locator('input[placeholder="e.g., Confraria do Vinho"]').fill('Deep Test Club');
  await p.locator('textarea').first().fill('Deep E2E test');
  await p.locator('button[type="submit"]').or(p.locator('button:text("Create")')).first().click();
  await p.waitForTimeout(3000);
  
  if (p.url().includes('/clubs/')) {
    clubId = p.url().split('/clubs/')[1]?.split('/')[0]?.split('?')[0];
    pass(`Club created: ${clubId}`);
    await shot(p, 'P2-club-created');
  } else {
    fail('Create club', p.url());
    await shot(p, 'P2-club-fail');
  }
  
  // ─── Marina joins club ───
  if (clubId) {
    console.log('\n📋 Phase 3: Join Club');
    const m = pages.marina;
    await m.goto(`${BASE}/clubs/${clubId}`, { waitUntil: 'networkidle', timeout: 15000 });
    await m.waitForTimeout(1500);
    await shot(m, 'P3-marina-before-join');
    
    const joinBtn = m.locator('button:text("Join")').or(m.locator('button:text("Entrar")')).first();
    if (await joinBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await joinBtn.click();
      await m.waitForTimeout(2000);
      await shot(m, 'P3-marina-after-join');
      pass('Marina joined club');
    } else {
      fail('Join club', 'No join button found');
      await shot(m, 'P3-no-join-btn');
    }
  }
  
  // ─── Carlos creates event with wines ───
  if (clubId) {
    console.log('\n📋 Phase 4: Create Event');
    await p.goto(`${BASE}/clubs/${clubId}/events/new`, { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(1500);
    await shot(p, 'P4-event-form');
    
    // Fill event name
    const inputs = await p.locator('input').all();
    if (inputs.length > 0) {
      await inputs[0].fill('Deep Tasting Night');
    }
    
    // Add wines manually (need >= 2 for event creation)
    const wineInput = p.locator('input[placeholder="Search wine with AI..."]');
    const addManualBtn = p.locator('button[title="Add manually"]').or(p.locator('button:has(span:text("add"))')).last();
    
    const wineNames = ['Catena Zapata Malbec 2019', 'Casillero del Diablo 2020', 'Penfolds Bin 389 2018'];
    for (const wineName of wineNames) {
      await wineInput.fill(wineName);
      await p.waitForTimeout(300);
      // Click the + (add manually) button
      await addManualBtn.click();
      await p.waitForTimeout(500);
    }
    
    await shot(p, 'P4-event-wines');
    
    // Submit event
    const createBtn = p.locator('button:text("Create Event")').or(p.locator('button[type="submit"]')).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await p.waitForTimeout(4000);
      await shot(p, 'P4-after-create-event');
      
      // Event form navigates to /events/:id on success
      const url = p.url();
      const match = url.match(/\/events\/([a-z0-9]+)$/i);
      if (match && match[1] !== 'new') {
        eventId = match[1];
        pass(`Event created: ${eventId}`);
      } else {
        // Maybe it went back to club detail? Check if there are events now
        fail('Event creation redirect', `URL: ${url}`);
      }
    } else {
      fail('Create event submit', 'No submit button');
    }
  }
  
  // ─── Tasting flow ───
  if (eventId) {
    console.log('\n📋 Phase 5: Tasting');
    await p.goto(`${BASE}/events/${eventId}/tasting`, { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(1500);
    await shot(p, 'P5-tasting-page');
    
    const hasTasting = await p.locator('text=Tasting').or(p.locator('text=Rate')).or(p.locator('text=Aroma')).first().isVisible().catch(() => false);
    if (hasTasting) pass('Tasting page loaded');
    else fail('Tasting page', 'No tasting content');
    
    // ─── Results ───
    console.log('\n📋 Phase 6: Results');
    await p.goto(`${BASE}/events/${eventId}/results`, { waitUntil: 'networkidle', timeout: 15000 });
    await p.waitForTimeout(1500);
    await shot(p, 'P6-results');
    
    const hasResults = await p.locator('text=Results').or(p.locator('text=Ranking')).or(p.locator('text=No ratings')).first().isVisible().catch(() => false);
    if (hasResults) pass('Results page loaded');
    else fail('Results page', 'No results content');
    
    // ─── Expenses ───
    console.log('\n📋 Phase 7: Expenses');
    await p.goto(`${BASE}/events/${eventId}/expenses`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(3000);
    await shot(p, 'P7-expenses');
    
    const hasExpenses = await p.locator('text=Expense').or(p.locator('text=Split')).or(p.locator('text=Payment')).or(p.locator('text=Total')).first().isVisible().catch(() => false);
    if (hasExpenses) pass('Expenses page loaded');
    else fail('Expenses page', 'No expenses content');
  }
  
  // ─── Cleanup ───
  console.log('\n🧹 Cleanup');
  if (adminToken) {
    for (const u of USERS) {
      try {
        const list = await pbApi('GET', `/api/collections/users/records?filter=(email='${u.email}')`, null, adminToken);
        for (const rec of (list.data?.items || [])) {
          // Delete clubs owned by user
          const clubs = await pbApi('GET', `/api/collections/wc_clubs/records?filter=(owner='${rec.id}')`, null, adminToken);
          for (const c of (clubs.data?.items || [])) {
            // Delete events for club
            const events = await pbApi('GET', `/api/collections/wc_events/records?filter=(club='${c.id}')`, null, adminToken);
            for (const ev of (events.data?.items || [])) {
              await pbApi('DELETE', `/api/collections/wc_events/records/${ev.id}`, null, adminToken);
            }
            await pbApi('DELETE', `/api/collections/wc_clubs/records/${c.id}`, null, adminToken);
          }
          await pbApi('DELETE', `/api/collections/users/records/${rec.id}`, null, adminToken);
        }
      } catch {}
    }
    console.log('  ✅ Data cleaned');
  }
  
  await browser.close();
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ✅ ${results.passed}  ❌ ${results.failed}`);
  if (results.errors.length) {
    console.log('  Failures:');
    results.errors.forEach(e => console.log(`    - ${e.t}: ${e.e}`));
  }
  console.log(`  Screenshots: ${OUT}\n${'═'.repeat(50)}\n`);
  
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
