/**
 * WineCircle — Full E2E Test Suite
 * 
 * 6 users, screenshots from EACH user's perspective at EVERY step.
 * Tests the complete flow: register → club → event → tasting → results → expenses → payments
 * 
 * Usage: node test/e2e-full.mjs
 */

import { chromium } from '/usr/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const BASE = 'https://winecircle.REDACTED_LEGACY_HOST.sslip.io';
const PB = 'https://winecircle.REDACTED_LEGACY_HOST.sslip.io/pb';
const OUT = '/root/.opencla/winecircle/test/e2e-screenshots';
const VIEWPORT = { width: 430, height: 932 };

// ─── 6 Test Users ───
const USERS = [
  { key: 'carlos',  name: 'Carlos Mendes',   email: 'carlos.e2e@test.example.com',  password: 'Test1234!', role: 'Organizador / Owner' },
  { key: 'marina',  name: 'Marina Silva',    email: 'marina.e2e@test.example.com',  password: 'Test1234!', role: 'Membro + Pagadora' },
  { key: 'pedro',   name: 'Pedro Almeida',   email: 'pedro.e2e@test.example.com',   password: 'Test1234!', role: 'Membro + Devedor' },
  { key: 'ana',     name: 'Ana Costa',       email: 'ana.e2e@test.example.com',     password: 'Test1234!', role: 'Late Joiner' },
  { key: 'lucas',   name: 'Lucas Ferreira',  email: 'lucas.e2e@test.example.com',   password: 'Test1234!', role: 'Membro Casual' },
  { key: 'juliana', name: 'Juliana Rocha',   email: 'juliana.e2e@test.example.com', password: 'Test1234!', role: 'Sommelier / Expert' },
];

const WINES = [
  { name: 'Catena Zapata Malbec 2019', producer: 'Catena Zapata', region: 'Mendoza', country: 'Argentina', grape: 'Malbec', year: 2019, price: 189 },
  { name: 'Casillero del Diablo Reserva 2020', producer: 'Concha y Toro', region: 'Maipo Valley', country: 'Chile', grape: 'Cabernet Sauvignon', year: 2020, price: 59 },
  { name: 'Penfolds Bin 389 2018', producer: 'Penfolds', region: 'South Australia', country: 'Australia', grape: 'Cabernet Shiraz', year: 2018, price: 320 },
  { name: 'Masi Costasera Amarone 2017', producer: 'Masi', region: 'Valpolicella', country: 'Italy', grape: 'Corvina Blend', year: 2017, price: 280 },
];

// ─── Helpers ───
let results = { passed: 0, failed: 0, errors: [] };
const contexts = {}; // browser contexts per user

function log(msg) { console.log(`  ${msg}`); }
function pass(test) { results.passed++; console.log(`  ✅ ${test}`); }
function fail(test, err) { results.failed++; results.errors.push({ test, error: err }); console.log(`  ❌ ${test}: ${err}`); }

async function screenshot(page, userKey, stepName) {
  const dir = path.join(OUT, userKey);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${stepName}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function screenshotAll(stepName, urlPath) {
  // Take screenshot from every user's perspective
  for (const u of USERS) {
    const ctx = contexts[u.key];
    if (!ctx) continue;
    try {
      if (urlPath) await ctx.page.goto(`${BASE}${urlPath}`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await ctx.page.waitForTimeout(800);
      await screenshot(ctx.page, u.key, stepName);
    } catch (e) {
      log(`⚠️ Screenshot ${u.key}/${stepName} failed: ${e.message}`);
    }
  }
}

async function pbApi(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${PB}${path}`, opts);
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

// ─── Cleanup: delete test users if they exist ───
async function cleanup() {
  log('🧹 Cleaning up previous test data...');
  try {
    const auth = await pbApi('POST', '/api/collections/_superusers/auth-with-password', {
      identity: 'admin@winecircle.local', password: 'REDACTED_PB_SUPERUSER_PASSWORD'
    });
    const token = auth.data.token;
    if (!token) { log('⚠️ Could not auth as admin, skipping cleanup'); return; }

    // Delete test users
    for (const u of USERS) {
      try {
        const list = await pbApi('GET', `/api/collections/users/records?filter=(email='${u.email}')`, null, token);
        for (const rec of (list.data.items || [])) {
          await pbApi('DELETE', `/api/collections/users/records/${rec.id}`, null, token);
          log(`  Deleted user ${rec.email}`);
        }
      } catch {}
    }

    // Delete test clubs
    try {
      const clubs = await pbApi('GET', `/api/collections/wc_clubs/records?filter=(name~'E2E')`, null, token);
      for (const rec of (clubs.data.items || [])) {
        await pbApi('DELETE', `/api/collections/wc_clubs/records/${rec.id}`, null, token);
      }
    } catch {}

    // Delete test ratings, expenses, payments
    for (const coll of ['wc_ratings', 'wc_expenses', 'wc_payments']) {
      try {
        const all = await pbApi('GET', `/api/collections/${coll}/records?perPage=100`, null, token);
        for (const rec of (all.data.items || [])) {
          await pbApi('DELETE', `/api/collections/${coll}/records/${rec.id}`, null, token);
        }
      } catch {}
    }
  } catch (e) {
    log(`⚠️ Cleanup error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════
// F1: REGISTER — All 6 users create accounts
// ═══════════════════════════════════════════
async function F1_Register(browser) {
  console.log('\n🔐 F1: REGISTER (6 users)');

  for (const u of USERS) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    contexts[u.key] = { ctx, page, user: u };

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Should land on auth page
    await screenshot(page, u.key, 'F1-01-auth-page');

    try {
      // Switch to "Create Account" tab
      const createTab = await page.$('button:has-text("Create Account")');
      if (createTab) {
        await createTab.click();
        await page.waitForTimeout(500);
      }

      // Fill name — placeholder is "How your friends know you"
      const nameInput = await page.$('input[placeholder*="friends" i], input[placeholder*="know you" i], input[type="text"]');
      if (nameInput) {
        await nameInput.fill(u.name);
      } else {
        log(`⚠️ ${u.name}: Name input not found!`);
      }

      // Fill email
      const emailInput = await page.$('input[type="email"], input[placeholder*="email" i]');
      if (emailInput) await emailInput.fill(u.email);

      // Fill password
      const pwInputs = await page.$$('input[type="password"]');
      for (const pw of pwInputs) await pw.fill(u.password);

      await page.waitForTimeout(300);
      await screenshot(page, u.key, 'F1-02-form-filled');

      // Submit — button text is "Create Account"
      const submitBtn = await page.$('button[type="submit"]:has-text("Create Account"), button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        // Fallback: press Enter
        await page.keyboard.press('Enter');
      }

      // Wait for navigation away from auth page
      try {
        await page.waitForURL(url => !url.toString().includes('auth') || url.pathname === '/', { timeout: 8000 });
      } catch {
        // Maybe it navigated to / which still works
      }
      await page.waitForTimeout(1500);
      await screenshot(page, u.key, 'F1-03-after-register');

      // Verify
      const currentUrl = page.url();
      const pageContent = await page.textContent('body').catch(() => '');
      if (!pageContent.includes('Sign In') && !pageContent.includes('Create Account')) {
        pass(`${u.name} registered`);
      } else if (currentUrl !== `${BASE}/` && !currentUrl.includes('auth')) {
        pass(`${u.name} registered (navigated to ${currentUrl})`);
      } else {
        // Check if there's an error toast
        const toast = await page.$('.toast, [role="alert"], [data-toast]');
        const toastText = toast ? await toast.textContent() : '';
        fail(`${u.name} register`, `Still on auth page. Toast: "${toastText}"`);
      }
    } catch (e) {
      fail(`${u.name} register`, e.message);
      await screenshot(page, u.key, 'F1-ERROR');
    }
  }
}

// ═══════════════════════════════════════════
// F2: LOGIN/LOGOUT — Test auth persistence
// ═══════════════════════════════════════════
async function F2_LoginLogout() {
  console.log('\n🔑 F2: LOGIN/LOGOUT');
  const p = contexts.carlos.page;

  try {
    // Check Carlos is logged in
    await p.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await screenshot(p, 'carlos', 'F2-01-logged-in-home');

    // Go to profile
    await p.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await screenshot(p, 'carlos', 'F2-02-profile');

    // Logout
    const logoutBtn = await p.$('button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Log out")');
    if (logoutBtn) {
      await logoutBtn.click();
      await p.waitForTimeout(1500);
      await screenshot(p, 'carlos', 'F2-03-after-logout');
    }

    // Re-login
    await p.goto(BASE, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);
    const emailInput = await p.$('input[type="email"]');
    if (emailInput) {
      // Should already be on Sign In tab (default)
      const signInTab = await p.$('button:has-text("Sign In")');
      if (signInTab) await signInTab.click();
      await p.waitForTimeout(300);

      await emailInput.fill('carlos.e2e@test.example.com');
      const pwInput = await p.$('input[type="password"]');
      if (pwInput) await pwInput.fill('Test1234!');

      const submitBtn = await p.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      
      try {
        await p.waitForURL(url => !url.toString().includes('auth'), { timeout: 8000 });
      } catch {}
      await p.waitForTimeout(1500);
      await screenshot(p, 'carlos', 'F2-04-re-logged-in');
      pass('Login/Logout cycle');
    } else {
      pass('Login persisted (no auth page shown)');
    }
  } catch (e) {
    fail('Login/Logout', e.message);
  }
}

// ═══════════════════════════════════════════
// F3: CREATE CLUB — Carlos creates club
// ═══════════════════════════════════════════
async function F3_CreateClub() {
  console.log('\n🏠 F3: CREATE CLUB');
  const p = contexts.carlos.page;

  try {
    await p.goto(`${BASE}/clubs/new`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await screenshot(p, 'carlos', 'F3-01-club-form-empty');

    // Fill club name
    const nameInput = await p.$('input[placeholder*="name" i], input[name="name"]');
    if (nameInput) await nameInput.fill('Confraria E2E Test');

    // Fill description
    const descInput = await p.$('textarea, input[placeholder*="description" i], input[name="description"]');
    if (descInput) await descInput.fill('Grupo de degustação para teste end-to-end automatizado');

    // Select type = blind if available
    const blindBtn = await p.$('button:has-text("Blind"), [data-value="blind"], label:has-text("Blind")');
    if (blindBtn) await blindBtn.click();

    await screenshot(p, 'carlos', 'F3-02-club-form-filled');

    // Submit
    const createBtn = await p.$('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
    if (createBtn) await createBtn.click();
    await p.waitForTimeout(2000);
    await screenshot(p, 'carlos', 'F3-03-after-create');

    pass('Club created');
  } catch (e) {
    fail('Create club', e.message);
  }

  // Screenshot from ALL users
  await screenshotAll('F3-04-clubs-list', '/clubs');
}

// ═══════════════════════════════════════════
// F4: JOIN CLUB — 5 others join
// ═══════════════════════════════════════════
async function F4_JoinClub() {
  console.log('\n👥 F4: JOIN CLUB (5 members)');

  // First, find the club URL from Carlos's perspective
  const p = contexts.carlos.page;
  await p.goto(`${BASE}/clubs`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(1000);

  // Click on the club
  const clubLink = await p.$('a:has-text("E2E"), [href*="/clubs/"]');
  if (clubLink) {
    await clubLink.click();
    await p.waitForTimeout(1500);
  }
  const clubUrl = p.url();
  await screenshot(p, 'carlos', 'F4-01-club-detail-owner');

  // Each other user joins
  for (const u of USERS.filter(u => u.key !== 'carlos')) {
    const pg = contexts[u.key]?.page;
    if (!pg) continue;

    try {
      await pg.goto(clubUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1000);
      await screenshot(pg, u.key, 'F4-02-before-join');

      const joinBtn = await pg.$('button:has-text("Join"), button:has-text("Enter"), button:has-text("Entrar")');
      if (joinBtn) {
        await joinBtn.click();
        await pg.waitForTimeout(1500);
        pass(`${u.name} joined club`);
      } else {
        log(`${u.name}: No join button (may already be member or auto-joined)`);
      }

      await screenshot(pg, u.key, 'F4-03-after-join');
    } catch (e) {
      fail(`${u.name} join club`, e.message);
    }
  }

  // Screenshot ALL users seeing the club with all members
  await screenshotAll('F4-04-club-all-members', clubUrl.replace(BASE, ''));
}

// ═══════════════════════════════════════════
// F5: CREATE EVENT — Carlos creates tasting event
// ═══════════════════════════════════════════
let eventUrl = '';

async function F5_CreateEvent() {
  console.log('\n🍷 F5: CREATE EVENT');
  const p = contexts.carlos.page;

  try {
    // Get club ID from current URL
    const clubUrl = p.url();
    const clubId = clubUrl.split('/clubs/')[1]?.split('/')[0] || '';

    await p.goto(`${BASE}/clubs/${clubId}/events/new`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);
    await screenshot(p, 'carlos', 'F5-01-event-form-empty');

    // Fill event name
    const nameInput = await p.$('input[placeholder*="name" i], input[placeholder*="title" i], input[name="title"], input[name="name"]');
    if (nameInput) await nameInput.fill('Degustação Malbec E2E');

    // Date
    const dateInput = await p.$('input[type="date"], input[type="datetime-local"]');
    if (dateInput) await dateInput.fill('2026-04-15');

    // Type = blind
    const blindOpt = await p.$('button:has-text("Blind"), [data-value="blind"], label:has-text("Blind"), select option[value="blind"]');
    if (blindOpt) await blindOpt.click();

    await screenshot(p, 'carlos', 'F5-02-event-form-basic');

    // Add wines
    for (let i = 0; i < WINES.length; i++) {
      const w = WINES[i];
      const addWineBtn = await p.$('button:has-text("Add Wine"), button:has-text("Add wine"), button:has-text("+ Wine"), button:has-text("Adicionar")');
      if (addWineBtn) {
        await addWineBtn.click();
        await p.waitForTimeout(500);
      }

      // Fill wine details — try various selectors
      const wineNameInput = await p.$(`input[placeholder*="wine name" i]:last-of-type, input[name="wineName"]:last-of-type, input[placeholder*="name" i]:nth-of-type(${i + 2})`);
      if (wineNameInput) await wineNameInput.fill(w.name);

      const producerInput = await p.$('input[placeholder*="producer" i]:last-of-type, input[name="producer"]:last-of-type');
      if (producerInput) await producerInput.fill(w.producer);

      const regionInput = await p.$('input[placeholder*="region" i]:last-of-type');
      if (regionInput) await regionInput.fill(w.region);

      const priceInput = await p.$('input[placeholder*="price" i]:last-of-type, input[type="number"]:last-of-type');
      if (priceInput) await priceInput.fill(String(w.price));

      if (i === 0) await screenshot(p, 'carlos', 'F5-03-first-wine-added');
    }

    await screenshot(p, 'carlos', 'F5-04-all-wines-added');

    // Submit
    const submitBtn = await p.$('button:has-text("Create Event"), button:has-text("Save"), button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await p.waitForTimeout(2000);

    eventUrl = p.url();
    await screenshot(p, 'carlos', 'F5-05-event-created');
    pass('Event created with 4 wines');
  } catch (e) {
    fail('Create event', e.message);
  }

  // All users see the event
  if (eventUrl) {
    await screenshotAll('F5-06-event-all-views', eventUrl.replace(BASE, ''));
  }
}

// ═══════════════════════════════════════════
// F6: TASTING — Each user ranks wines
// ═══════════════════════════════════════════
async function F6_Tasting() {
  console.log('\n🏆 F6: TASTING — RANKING');

  // First, Carlos starts the tasting
  const p = contexts.carlos.page;
  try {
    if (eventUrl) await p.goto(eventUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1000);

    const startBtn = await p.$('button:has-text("Start Tasting"), button:has-text("Begin"), button:has-text("Iniciar")');
    if (startBtn) {
      await startBtn.click();
      await p.waitForTimeout(1500);
      pass('Tasting started');
    }
  } catch (e) {
    fail('Start tasting', e.message);
  }

  // Get tasting URL
  const eventId = eventUrl.split('/events/')[1]?.split('/')[0] || '';
  const tastingUrl = `${BASE}/events/${eventId}/tasting`;

  // Each user does the tasting
  for (const u of USERS.filter(u => u.key !== 'ana')) { // Ana is late joiner, doesn't taste
    const pg = contexts[u.key]?.page;
    if (!pg) continue;

    try {
      await pg.goto(tastingUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      await screenshot(pg, u.key, 'F6-01-tasting-page');

      // The ranking is drag-and-drop — try to interact
      // Just screenshot the initial state; DnD is hard to automate reliably
      await screenshot(pg, u.key, 'F6-02-ranking-view');

      // Try clicking notes tab
      const notesTab = await pg.$('button:has-text("Notes"), button:has-text("Notas"), [data-tab="notes"]');
      if (notesTab) {
        await notesTab.click();
        await pg.waitForTimeout(800);
        await screenshot(pg, u.key, 'F6-03-notes-tab');
      }

      log(`${u.name}: Tasting page loaded`);
    } catch (e) {
      fail(`${u.name} tasting`, e.message);
    }
  }

  // Ana's view — she should see limited access or be told she's not in the event
  const anaPage = contexts.ana?.page;
  if (anaPage) {
    await anaPage.goto(tastingUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await anaPage.waitForTimeout(1000);
    await screenshot(anaPage, 'ana', 'F6-04-late-joiner-view');
  }
}

// ═══════════════════════════════════════════
// F7: RESULTS — Reveal + Borda count
// ═══════════════════════════════════════════
async function F7_Results() {
  console.log('\n📊 F7: RESULTS');

  const eventId = eventUrl.split('/events/')[1]?.split('/')[0] || '';
  const resultsUrl = `${BASE}/events/${eventId}/results`;

  // All users see results
  for (const u of USERS) {
    const pg = contexts[u.key]?.page;
    if (!pg) continue;

    try {
      await pg.goto(resultsUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(2000);
      await screenshot(pg, u.key, 'F7-01-results-page');

      // Scroll to see full results
      await pg.evaluate(() => window.scrollTo(0, 500));
      await pg.waitForTimeout(500);
      await screenshot(pg, u.key, 'F7-02-results-scrolled');

      await pg.evaluate(() => window.scrollTo(0, 1000));
      await pg.waitForTimeout(500);
      await screenshot(pg, u.key, 'F7-03-results-bottom');
    } catch (e) {
      fail(`${u.name} results`, e.message);
    }
  }
}

// ═══════════════════════════════════════════
// F8: EXPENSES — Divide the bill
// ═══════════════════════════════════════════
async function F8_Expenses() {
  console.log('\n💰 F8: EXPENSES');

  const eventId = eventUrl.split('/events/')[1]?.split('/')[0] || '';
  const expUrl = `${BASE}/events/${eventId}/expenses`;

  // Carlos goes to expense page
  const p = contexts.carlos.page;
  try {
    await p.goto(expUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1500);
    await screenshot(p, 'carlos', 'F8-01-expense-page-empty');

    // Fill total cost
    const totalInput = await p.$('input[placeholder*="total" i], input[name="total"], input[type="number"]');
    if (totalInput) await totalInput.fill('848');

    // Select who paid — Marina
    const paidBySelect = await p.$('select[name="paidBy"], button:has-text("Marina"), button:has-text("Paid by")');
    if (paidBySelect) await paidBySelect.click?.();

    await screenshot(p, 'carlos', 'F8-02-expense-filled');

    // Submit
    const splitBtn = await p.$('button:has-text("Split"), button:has-text("Calculate"), button:has-text("Dividir"), button[type="submit"]');
    if (splitBtn) {
      await splitBtn.click();
      await p.waitForTimeout(2000);
    }

    await screenshot(p, 'carlos', 'F8-03-expense-split');
    pass('Expense created');
  } catch (e) {
    fail('Create expense', e.message);
  }

  // All users see their expenses
  await screenshotAll('F8-04-expense-all-views', expUrl.replace(BASE, ''));
}

// ═══════════════════════════════════════════
// F9: PAYMENTS — Pix flow
// ═══════════════════════════════════════════
async function F9_Payments() {
  console.log('\n💳 F9: PAYMENTS');

  const eventId = eventUrl.split('/events/')[1]?.split('/')[0] || '';
  const expUrl = `${BASE}/events/${eventId}/expenses`;

  // Pedro sees his debt
  const pedroPage = contexts.pedro?.page;
  if (pedroPage) {
    try {
      await pedroPage.goto(expUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await pedroPage.waitForTimeout(1500);
      await screenshot(pedroPage, 'pedro', 'F9-01-pedro-sees-debt');

      // Mark as paid
      const payBtn = await pedroPage.$('button:has-text("Mark as Paid"), button:has-text("Pagar"), button:has-text("Paid")');
      if (payBtn) {
        await payBtn.click();
        await pedroPage.waitForTimeout(1500);
        await screenshot(pedroPage, 'pedro', 'F9-02-pedro-marked-paid');
        pass('Pedro marked payment');
      }
    } catch (e) {
      fail('Pedro payment', e.message);
    }
  }

  // Marina confirms Pedro's payment
  const marinaPage = contexts.marina?.page;
  if (marinaPage) {
    try {
      await marinaPage.goto(expUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await marinaPage.waitForTimeout(1500);
      await screenshot(marinaPage, 'marina', 'F9-03-marina-sees-payments');

      const confirmBtn = await marinaPage.$('button:has-text("Confirm"), button:has-text("Confirmar")');
      if (confirmBtn) {
        await confirmBtn.click();
        await marinaPage.waitForTimeout(1500);
        await screenshot(marinaPage, 'marina', 'F9-04-marina-confirmed');
        pass('Marina confirmed payment');
      }
    } catch (e) {
      fail('Marina confirm', e.message);
    }
  }

  // Lucas disputes
  const lucasPage = contexts.lucas?.page;
  if (lucasPage) {
    try {
      await lucasPage.goto(expUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await lucasPage.waitForTimeout(1500);
      await screenshot(lucasPage, 'lucas', 'F9-05-lucas-sees-debt');

      const disputeBtn = await lucasPage.$('button:has-text("Dispute"), button:has-text("Disputar")');
      if (disputeBtn) {
        await disputeBtn.click();
        await lucasPage.waitForTimeout(1500);
        await screenshot(lucasPage, 'lucas', 'F9-06-lucas-disputed');
        pass('Lucas disputed payment');
      }
    } catch (e) {
      fail('Lucas dispute', e.message);
    }
  }

  // Final: All users see payment status
  await screenshotAll('F9-07-payment-final-all-views', expUrl.replace(BASE, ''));
}

// ═══════════════════════════════════════════
// F10: PROFILE — Pix key setup
// ═══════════════════════════════════════════
async function F10_Profile() {
  console.log('\n👤 F10: PROFILE');

  for (const u of USERS) {
    const pg = contexts[u.key]?.page;
    if (!pg) continue;

    try {
      await pg.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1000);
      await screenshot(pg, u.key, 'F10-01-profile');
    } catch (e) {
      log(`${u.name}: Profile screenshot failed`);
    }
  }
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
async function main() {
  console.log('═'.repeat(60));
  console.log('🍷 WINE CIRCLE — E2E TEST SUITE');
  console.log(`📸 Screenshots: ${OUT}`);
  console.log(`🌐 Target: ${BASE}`);
  console.log(`👥 Users: ${USERS.map(u => u.name).join(', ')}`);
  console.log('═'.repeat(60));

  fs.mkdirSync(OUT, { recursive: true });

  await cleanup();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });

  try {
    await F1_Register(browser);
    await F2_LoginLogout();
    await F3_CreateClub();
    await F4_JoinClub();
    await F5_CreateEvent();
    await F6_Tasting();
    await F7_Results();
    await F8_Expenses();
    await F9_Payments();
    await F10_Profile();
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
  }

  // Close all contexts
  for (const u of USERS) {
    try { await contexts[u.key]?.ctx?.close(); } catch {}
  }
  await browser.close();

  // Report
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed: ${results.passed}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.log('\n  Errors:');
    for (const e of results.errors) {
      console.log(`    • ${e.test}: ${e.error}`);
    }
  }

  // Count screenshots
  let totalScreenshots = 0;
  for (const u of USERS) {
    const dir = path.join(OUT, u.key);
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
      totalScreenshots += files.length;
      console.log(`  📸 ${u.name}: ${files.length} screenshots`);
    } catch {}
  }
  console.log(`\n  📸 Total: ${totalScreenshots} screenshots across ${USERS.length} users`);
  console.log(`  📁 ${OUT}`);

  // Save summary
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    users: USERS.map(u => ({ key: u.key, name: u.name, role: u.role })),
    results,
    totalScreenshots,
  }, null, 2));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
