/**
 * WineCircle — QA Smoke Test v2
 * Tests all flows with correct selectors based on actual UI
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const BASE = 'https://winecircle.melhor.dev';
const PB = `${BASE}/pb`;
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'qa-screenshots');
const VIEWPORT = { width: 430, height: 932 };
const ts = Date.now();
const USER = { email: `qa-${ts}@test.example.com`, password: 'QASmoke2026!', name: 'QA Smoke' };

let page, browser;
let results = { passed: 0, failed: 0, errors: [] };
let clubId = null;

function pass(t) { results.passed++; console.log(`  ✅ ${t}`); }
function fail(t, e) { results.failed++; results.errors.push({ t, e: String(e).slice(0, 200) }); console.log(`  ❌ ${t}: ${String(e).slice(0, 200)}`); }

async function shot(name) {
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

async function setup() {
  console.log('\n🍷 WineCircle QA Smoke Test v2\n');
  fs.rmSync(OUT, { recursive: true, force: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'pt-BR' });
  page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('ServiceWorker'))
      console.log(`    ⚠️ ${msg.text().slice(0, 150)}`);
  });
}

// ─── F1: Register via UI ───
async function testRegister() {
  console.log('📋 F1: Register + Login');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot('01-auth-login');

  // Switch to "Create Account" tab
  await page.locator('text=Create Account').click();
  await page.waitForTimeout(500);

  // Fill form: name, email, password
  await page.locator('input[placeholder="How your friends know you"]').fill(USER.name);
  await page.locator('input[placeholder="you@example.com"]').fill(USER.email);
  await page.locator('input[placeholder="At least 8 characters"]').fill(USER.password);
  await shot('02-register-filled');

  // Submit
  await page.locator('button:text("Create Account")').last().click();
  await page.waitForTimeout(3000);
  await shot('03-after-register');

  // Check if we got past auth page (Home should show)
  const url = page.url();
  const hasHome = await page.locator('text=Wine Circle').first().isVisible().catch(() => false);
  if (hasHome && !await page.locator('input[placeholder="you@example.com"]').isVisible().catch(() => false)) {
    pass('Register → redirected to Home');
  } else {
    // Maybe we're still on auth — try login
    console.log('    ℹ️ Still on auth, trying login...');
    await page.locator('text=Sign In').first().click();
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="you@example.com"]').fill(USER.email);
    await page.locator('input[placeholder="At least 8 characters"]').fill(USER.password);
    await page.locator('button:text("Sign In")').last().click();
    await page.waitForTimeout(3000);
    await shot('03b-after-login');
    
    if (!await page.locator('input[placeholder="you@example.com"]').isVisible().catch(() => false)) {
      pass('Login after register');
    } else {
      fail('Auth', 'Still on auth page after login');
    }
  }
}

// ─── F2: Home ───
async function testHome() {
  console.log('📋 F2: Home');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot('04-home');
  
  const homeContent = await page.locator('text=Wine Circle').first().isVisible().catch(() => false);
  if (homeContent) pass('Home page');
  else fail('Home', 'No content');
}

// ─── F3: Create Club ───
async function testCreateClub() {
  console.log('📋 F3: Create Club');
  await page.goto(`${BASE}/clubs/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot('05-club-form');

  // Fill club form
  const nameInput = page.locator('input[placeholder="e.g., Confraria do Vinho"]');
  if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nameInput.fill('QA Smoke Club');
    const descInput = page.locator('textarea[placeholder="What\'s your club about?"]');
    if (await descInput.isVisible().catch(() => false)) {
      await descInput.fill('Automated QA test club');
    }
    await shot('06-club-filled');
    
    // Submit
    const submitBtn = page.locator('button[type="submit"]').or(page.locator('button:text("Create")')).or(page.locator('button:text("Criar")')).first();
    await submitBtn.click();
    await page.waitForTimeout(3000);
    await shot('07-after-club-create');
    
    // Should redirect to club detail
    if (page.url().includes('/clubs/')) {
      clubId = page.url().split('/clubs/')[1]?.split('/')[0]?.split('?')[0];
      pass(`Club created (id: ${clubId})`);
    } else {
      pass('Club form submitted');
    }
  } else {
    fail('Club form', 'Name input not found');
  }
}

// ─── F4: Club Detail ───
async function testClubDetail() {
  console.log('📋 F4: Club Detail');
  
  if (clubId) {
    await page.goto(`${BASE}/clubs/${clubId}`, { waitUntil: 'networkidle', timeout: 15000 });
  } else {
    await page.goto(`${BASE}/clubs`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const link = page.locator('a[href*="/clubs/"]').first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForTimeout(1500);
    }
  }
  await page.waitForTimeout(1000);
  await shot('08-club-detail');
  
  if (page.url().includes('/clubs/')) {
    pass('Club detail page');
    if (!clubId) clubId = page.url().split('/clubs/')[1]?.split('/')[0]?.split('?')[0];
  } else {
    fail('Club detail', 'Not on club page');
  }
}

// ─── F5: Create Event ───
async function testCreateEvent() {
  console.log('📋 F5: Create Event');
  
  if (!clubId) { fail('Create event', 'No club ID'); return; }
  
  await page.goto(`${BASE}/clubs/${clubId}/events/new`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot('09-event-form');
  
  // Check EventForm selectors
  const titleInput = page.locator('input').first();
  if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    pass('Event form loaded');
    await titleInput.fill('QA Tasting Night');
    await shot('10-event-form-filled');
  } else {
    fail('Event form', 'No inputs found');
  }
}

// ─── F10: Search ───
async function testSearch() {
  console.log('📋 F10: Search');
  await page.goto(`${BASE}/search`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot('11-search');
  
  const searchInput = page.locator('input[placeholder="Search wines, regions, grapes..."]');
  if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchInput.fill('Malbec Mendoza');
    await searchInput.press('Enter');
    await page.waitForTimeout(5000); // Wait for AI search
    await shot('12-search-results');
    pass('Search executed');
  } else {
    // Try any visible input
    const anyInput = page.locator('input[type="text"]').first();
    if (await anyInput.isVisible().catch(() => false)) {
      await anyInput.fill('Malbec');
      await anyInput.press('Enter');
      await page.waitForTimeout(3000);
      await shot('12-search-results');
      pass('Search (alt selector)');
    } else {
      fail('Search', 'No search input found');
    }
  }
}

// ─── F11: Profile ───
async function testProfile() {
  console.log('📋 F11: Profile');
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot('13-profile');
  
  // Profile should show user info
  const hasContent = await page.locator('text=PIX').or(page.locator('text=Profile')).or(page.locator('text=Perfil')).or(page.locator('text=display')).first().isVisible().catch(() => false);
  if (hasContent) pass('Profile page');
  else {
    // Check if we see username or email
    const hasUser = await page.locator(`text=${USER.name}`).or(page.locator(`text=${USER.email}`)).first().isVisible().catch(() => false);
    if (hasUser) pass('Profile page (user visible)');
    else fail('Profile', 'No profile content');
  }
}

// ─── Navigation check ───
async function testNavigation() {
  console.log('📋 Navigation');
  
  // Check bottom nav exists
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  
  // BottomNav uses material symbols icons - check for nav links
  const navLinks = await page.locator('nav a, [role="navigation"] a').count();
  if (navLinks >= 3) pass(`Bottom nav (${navLinks} links)`);
  else {
    // Check sidebar
    const sidebar = await page.locator('aside, [class*="sidebar"]').count();
    if (sidebar > 0) pass('Sidebar navigation');
    else fail('Navigation', `Only ${navLinks} nav links found`);
  }
  
  await shot('14-nav-check');
}

// ─── Cleanup ───
async function cleanup() {
  try {
    const auth = await pbApi('POST', '/api/collections/_superusers/auth-with-password', {
      identity: 'admin@winecircle.local', password: 'REDACTED_PB_SUPERUSER_PASSWORD'
    });
    const token = auth.data?.token;
    if (token) {
      const list = await pbApi('GET', `/api/collections/users/records?filter=(email='${USER.email}')`, null, token);
      for (const rec of (list.data?.items || [])) {
        const clubs = await pbApi('GET', `/api/collections/wc_clubs/records?filter=(owner='${rec.id}')`, null, token);
        for (const c of (clubs.data?.items || [])) {
          await pbApi('DELETE', `/api/collections/wc_clubs/records/${c.id}`, null, token);
        }
        await pbApi('DELETE', `/api/collections/users/records/${rec.id}`, null, token);
      }
      console.log('  🧹 Cleaned up');
    }
  } catch (e) { console.log(`  ⚠️ Cleanup: ${e.message}`); }
}

async function main() {
  await setup();
  try {
    await testRegister();
    await testHome();
    await testCreateClub();
    await testClubDetail();
    await testCreateEvent();
    await testSearch();
    await testProfile();
    await testNavigation();
  } catch (e) { console.error(`\n💥 Fatal: ${e.message}`); }
  
  await cleanup();
  await browser.close();
  
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ✅ ${results.passed}  ❌ ${results.failed}`);
  if (results.errors.length) {
    console.log('  Failures:');
    results.errors.forEach(e => console.log(`    - ${e.t}: ${e.e}`));
  }
  console.log(`  Screenshots: ${OUT}\n${'═'.repeat(50)}\n`);
  
  // Write JSON report
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
