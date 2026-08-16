/**
 * Utilitários de teste.
 *
 * Regra number um: nada aqui toca produção. A suíte anterior rodava contra
 * https://winecircle.melhor.dev e criava usuários reais a cada execução — por
 * isso o banco tinha 11 contas de teste. O guard abaixo recusa qualquer URL
 * que não seja local.
 */

import { expect } from '@playwright/test';

export const PB_URL = process.env.WC_TEST_PB_URL || 'http://127.0.0.1:8091';
export const BASE_URL = process.env.WC_TEST_BASE_URL || 'http://127.0.0.1:5174';
const ADMIN = process.env.WC_TEST_PB_ADMIN || 'test@local.dev';
const ADMIN_PASS = process.env.WC_TEST_PB_PASSWORD || 'TesteLocal2026!';

function assertLocal(url, label) {
  const ok = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
  if (!ok) {
    throw new Error(
      `RECUSANDO RODAR: ${label} aponta para "${url}", que não é local.\n` +
      `Estes testes criam e apagam dados. Suba a instância de teste com "npm run pb:test".`,
    );
  }
}
assertLocal(PB_URL, 'WC_TEST_PB_URL');
assertLocal(BASE_URL, 'WC_TEST_BASE_URL');

let adminToken = null;

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function adminAuth() {
  if (adminToken) return adminToken;
  const r = await api('/api/collections/_superusers/auth-with-password', {
    method: 'POST', body: { identity: ADMIN, password: ADMIN_PASS },
  });
  adminToken = r.token;
  return adminToken;
}

/** Zera as collections do app entre cenários — deixa os superusers em paz. */
export async function resetDatabase() {
  const token = await adminAuth();
  // Ordem importa: filhos antes dos pais, para não brigar com cascade.
  for (const coll of ['wc_payments', 'wc_expenses', 'wc_ratings', 'wc_events', 'wc_clubs', 'users']) {
    let page = await api(`/api/collections/${coll}/records?perPage=200`, { token });
    while (page.items.length) {
      for (const item of page.items) {
        await api(`/api/collections/${coll}/records/${item.id}`, { method: 'DELETE', token })
          .catch(() => {}); // já removido por cascade
      }
      page = await api(`/api/collections/${coll}/records?perPage=200`, { token });
      if (page.items.length === 0) break;
    }
  }
}

/** Cria uma conta direto pela API — mais rápido e estável que passar pela UI. */
export async function createUser({ email, password = 'SenhaTeste123', name }) {
  const token = await adminAuth();
  const user = await api('/api/collections/users/records', {
    method: 'POST', token,
    body: {
      email, password, passwordConfirm: password,
      display_name: name, verified: true,
    },
  });
  return { ...user, email, password, name };
}

export async function setPixKey(userId, pixKey) {
  const token = await adminAuth();
  return api(`/api/collections/users/records/${userId}`, {
    method: 'PATCH', token, body: { pix_key: pixKey },
  });
}

export async function countRecords(coll, filter = '') {
  const token = await adminAuth();
  const q = filter ? `&filter=${encodeURIComponent(filter)}` : '';
  const r = await api(`/api/collections/${coll}/records?perPage=1${q}`, { token });
  return r.totalItems;
}

export async function listRecords(coll, filter = '') {
  const token = await adminAuth();
  const q = filter ? `&filter=${encodeURIComponent(filter)}` : '';
  const r = await api(`/api/collections/${coll}/records?perPage=200${q}`, { token });
  return r.items;
}

/**
 * Abre a folha de autenticação.
 *
 * O formulário deixou de ficar no fluxo da página: agora mora numa folha modal
 * aberta pelo cabeçalho (telas largas) ou pela barra fixa do rodapé (celular).
 * Usamos o controle que estiver visível no viewport do teste.
 */
export async function abrirFolhaAuth(page, modo) {
  // Os dois controles existem sempre no DOM — o cabeçalho some por CSS no
  // celular, a barra some no desktop. Filtrar por visibilidade é o que
  // importa: `.or()` sozinho pegaria o oculto e travaria esperando ele ficar
  // clicável, e um `isVisible()` solto não tem retry e responde antes de a
  // página pintar.
  const botao = page
    .locator(`[data-testid="header-${modo}"], [data-testid="dock-${modo}"]`)
    .filter({ visible: true })
    .first();
  await botao.click({ timeout: 15000 });
  await page.getByTestId('auth-sheet').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId(`tab-${modo}`).click();
}

/**
 * Espera sair da tela de entrada.
 *
 * `page.waitForURL` aguarda um evento de navegação; o app troca de rota pelo
 * history do router, sem recarregar, e a espera estourava por timeout mesmo
 * com o login tendo dado certo. `expect(page).not.toHaveURL` faz polling da
 * URL, que é o que interessa aqui.
 */
async function esperarEntrar(page) {
  await expect(page).not.toHaveURL(/\/entrar/, { timeout: 20000 });
  await expect(page.getByTestId('auth-sheet')).toHaveCount(0);
}

/**
 * Faz login pela UI e devolve a página pronta.
 *
 * Passa pela interface de propósito: é o caminho que a pessoa percorre, e
 * qualquer quebra no formulário aparece aqui em vez de ser contornada.
 */
export async function loginAs(page, user) {
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
  await abrirFolhaAuth(page, 'login');
  await page.getByTestId('email').fill(user.email);
  await page.getByTestId('password').fill(user.password);
  await page.getByTestId('submit').click();
  await esperarEntrar(page);
  return page;
}

export async function registerViaUI(page, { email, password = 'SenhaTeste123', name }) {
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
  await abrirFolhaAuth(page, 'register');
  await page.getByTestId('name').fill(name);
  await page.getByTestId('email').fill(email);
  await page.getByTestId('password').fill(password);
  await page.getByTestId('submit').click();
  await esperarEntrar(page);
  return { email, password, name };
}

/** Contexto isolado por pessoa — cada uma com o próprio storage, como na vida real. */
export async function newPersonContext(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.consoleErrors = errors;
  return { context, page };
}

export const uniqueEmail = (prefix) =>
  `${prefix}-${Math.floor(Math.random() * 1e9).toString(36)}@teste.local`;
