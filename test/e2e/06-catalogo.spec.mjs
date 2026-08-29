import { test, expect } from '@playwright/test';
import {
  resetDatabase, createUser, loginAs, uniqueEmail, adminAuth, PB_URL,
} from '../helpers.mjs';

/**
 * Cenário 6 — Catálogo de vinhos sem chave de API
 *
 * O autocomplete e o preenchimento automático eram os únicos usos da chave do
 * Gemini que ficou pública dentro do bundle. Agora saem de um catálogo local
 * de ~245 mil vinhos, sem tocar em serviço externo.
 *
 * Estes testes pulam se o catálogo não estiver carregado — ele não vem de uma
 * migration. Em produção entra pelo `importar-catalogo.mjs` (~245 mil linhas,
 * direto no SQLite); no CI e no ambiente local, pelo `semear-catalogo-teste.mjs`
 * (50 vinhos, pela API). O que importa aqui é ter catálogo, não o tamanho dele.
 */

async function api(path, token, init = {}) {
  const r = await fetch(`${PB_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: token, ...(init.headers || {}) },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

test.describe('Cenário 6 — Catálogo local', () => {
  let user, token, temCatalogo = false;

  test.beforeAll(async () => {
    await resetDatabase();
    user = await createUser({ email: uniqueEmail('cat'), name: 'Catadora' });

    const auth = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: user.email, password: user.password }),
    }).then((r) => r.json());
    token = auth.token;

    await adminAuth();
    const caps = await api('/api/wc/capabilities', token);
    // O corte era > 1000, herdado de quando o catálogo só existia no import de
    // produção. Isso mantinha estes testes pulando para sempre no CI, que nunca
    // carregava catálogo nenhum — e o cenário 2 quebrava por falta do mesmo
    // dado, sem ninguém ver a relação.
    temCatalogo = (caps.body?.catalog || 0) > 0;
  });

  test('o servidor informa o tamanho do catálogo e se há IA', async () => {
    const { status, body } = await api('/api/wc/capabilities', token);
    expect(status).toBe(200);
    expect(typeof body.catalog).toBe('number');
    expect(typeof body.aiSearch).toBe('boolean');
  });

  test('autocomplete devolve vinhos reais, sem chave de API', async () => {
    test.skip(!temCatalogo, 'catálogo não carregado nesta instância');

    const { status, body } = await api('/api/wc/wine-suggest?q=chateau%20marg', token);
    expect(status).toBe(200);
    expect(body.suggestions.length).toBeGreaterThan(0);
    // Busca insensível a acento: "chateau" precisa achar "Château"
    expect(body.suggestions[0].name).toMatch(/Château Margaux/i);
    // E vem com metadados, então escolher já preenche o vinho
    expect(body.suggestions[0]).toHaveProperty('year');
  });

  test('busca curta demais não devolve nada', async () => {
    const { body } = await api('/api/wc/wine-suggest?q=c', token);
    expect(body.suggestions).toEqual([]);
  });

  test('resolver um vinho do catálogo não usa IA', async () => {
    test.skip(!temCatalogo, 'catálogo não carregado nesta instância');

    const { status, body } = await api('/api/wc/wine-resolve', token, {
      method: 'POST', body: JSON.stringify({ query: 'Château Margaux 2009  Margaux' }),
    });
    expect(status).toBe(200);
    expect(body.source).toBe('catalog');
    expect(body.wine.name).toMatch(/Margaux/);
    expect(body.wine.year).toBe(2009);
  });

  test('resolve como a pessoa digita, não só com o nome exato', async () => {
    // A primeira versão exigia igualdade exata do nome normalizado — e ninguém
    // digita "Château Margaux 2009  Margaux" com os dois espaços. Na prática o
    // catálogo nunca era consultado: toda busca caía em 503.
    test.skip(!temCatalogo, 'catálogo não carregado nesta instância');

    for (const q of ['Chateau Margaux', 'Catena Malbec', 'Opus One', 'malbec mendoza']) {
      const { status, body } = await api('/api/wc/wine-resolve', token, {
        method: 'POST', body: JSON.stringify({ query: q }),
      });
      expect(status, `"${q}" deveria resolver pelo catálogo`).toBe(200);
      expect(body.source).toBe('catalog');
      expect(body.wine.name).toBeTruthy();
    }
  });

  test('vinho desconhecido sem provedor explica o que fazer', async () => {
    const { status, body } = await api('/api/wc/wine-resolve', token, {
      method: 'POST', body: JSON.stringify({ query: 'Vinho Inexistente XPTO 2099' }),
    });
    // Sem provedor de LLM configurado: 503 com instrução acionável,
    // não um erro genérico
    expect(status).toBe(503);
    expect(body.message).toMatch(/manualmente/i);
  });

  test('as rotas exigem autenticação', async () => {
    const r = await fetch(`${PB_URL}/api/wc/wine-suggest?q=catena`);
    expect(r.status).toBe(401);
  });

  test('o formulário de evento oferece a busca no catálogo', async ({ page }) => {
    test.skip(!temCatalogo, 'catálogo não carregado nesta instância');

    const club = await fetch(`${PB_URL}/api/collections/wc_clubs/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await adminAuth() },
      body: JSON.stringify({ name: 'Clube', owner: user.id, members: [user.id] }),
    }).then((r) => r.json());

    await loginAs(page, user);
    await page.goto(`/clubs/${club.id}/events/new`);

    await expect(page.getByTestId('wine-input')).toBeVisible();

    // Sugestões aparecem enquanto digita, com uva e região
    await page.getByTestId('wine-input').fill('chateau marg');
    await expect(page.getByTestId('sugestoes-vinho')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('sugestao-0')).toContainText(/Château Margaux/);

    // Escolher preenche o vinho inteiro, sem ida ao servidor
    await page.getByTestId('sugestao-0').click();
    await expect(page.getByText(/Château Margaux/).first()).toBeVisible();
  });

  test('a aba Descobrir saiu do ar', async ({ page }) => {
    // Era uma vitrine que não conectava com clube nem evento, e trazia as
    // únicas imagens hotlinkadas de terceiros do app.
    // Rota morta cai no catch-all. Deslogado, a raiz leva à entrada — o que
    // importa é que /search não existe mais e o link sumiu da navegação.
    await page.goto('/search');
    await expect(page).not.toHaveURL(/\/search/);
    await expect(page.getByRole('link', { name: /Descobrir/i })).toHaveCount(0);
  });
});
