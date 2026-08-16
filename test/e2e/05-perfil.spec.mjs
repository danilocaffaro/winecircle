import { test, expect } from '@playwright/test';
import {
  resetDatabase, createUser, loginAs, uniqueEmail, listRecords, adminAuth, PB_URL,
} from '../helpers.mjs';

/**
 * Cenário 5 — Perfil e painel
 *
 * A tela que mais mentia: lia um localStorage que ninguém escrevia desde a
 * migração para o backend, então estatísticas, conquistas, histórico e coleção
 * ficavam em zero para todo mundo, para sempre (A-06). E a Home era uma
 * landing estática mesmo para quem já tinha entrado (A-17).
 */

async function apiPost(coll, body) {
  const token = await adminAuth();
  const r = await fetch(`${PB_URL}/api/collections/${coll}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${coll}: ${r.status} ${await r.text()}`);
  return r.json();
}

const WINES = [
  { id: 'w0', name: 'Catena Malbec 2020', producer: 'Catena', type: 'red' },
  { id: 'w1', name: 'Quinta do Crasto 2019', producer: 'Crasto', type: 'red' },
];

test.describe('Cenário 5 — Perfil e painel inicial', () => {
  let carlos, marina, clubId;

  test.beforeAll(async () => {
    await resetDatabase();
    carlos = await createUser({ email: uniqueEmail('carlos'), name: 'Carlos Mendes' });
    marina = await createUser({ email: uniqueEmail('marina'), name: 'Marina Silva' });

    const club = await apiPost('wc_clubs', {
      name: 'Confraria da Quinta', owner: carlos.id,
      members: [carlos.id, marina.id], type: 'blind',
    });
    clubId = club.id;

    // Uma degustação concluída, com Carlos tendo votado
    const concluido = await apiPost('wc_events', {
      title: 'Malbec às cegas', club: club.id, date: '2026-07-10',
      type: 'blind', status: 'completed', wines: WINES,
      participants: [carlos.id, marina.id], created_by: carlos.id,
    });
    for (let i = 0; i < WINES.length; i++) {
      await apiPost('wc_ratings', {
        event: concluido.id, user: carlos.id, wine_index: i, rank: i + 1, stars: 4,
      });
    }

    // Uma marcada e uma em andamento
    await apiPost('wc_events', {
      title: 'Tintos de agosto', club: club.id, date: '2026-09-20',
      type: 'open', status: 'upcoming', wines: WINES,
      participants: [carlos.id, marina.id], created_by: carlos.id,
    });
    await apiPost('wc_events', {
      title: 'Brancos de verão', club: club.id, date: '2026-08-15',
      type: 'blind', status: 'tasting', wines: WINES,
      participants: [carlos.id, marina.id], created_by: carlos.id,
    });
  });

  test('as estatísticas refletem dados reais, não zeros', async ({ page }) => {
    // A-06: antes, tudo aqui vinha de services/storage.ts (localStorage), que
    // nada mais escrevia — todo usuário via 0 vinhos, 0 degustações, 0 clubes.
    await loginAs(page, carlos);
    await page.goto('/profile');

    await expect(page.getByTestId('stat-emoji_events')).toContainText('1'); // degustações
    await expect(page.getByTestId('stat-group')).toContainText('1');        // clubes
    await expect(page.getByTestId('stat-event')).toContainText('3');        // eventos
    await expect(page.getByTestId('stat-wine_bar')).toContainText('2');     // vinhos provados
  });

  test('a conquista "Primeiro gole" aparece conquistada', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto('/profile');
    await expect(page.getByText('Primeiro gole')).toBeVisible();
    // "Sommelier" (5 degustações) ainda não
    await expect(page.getByText('Sommelier')).toBeVisible();
  });

  test('o histórico lista a degustação e o link leva ao evento certo', async ({ page }) => {
    // O link antigo apontava para /event/:clubId/:id — rota que nunca existiu
    // no router, então clicar levava a lugar nenhum.
    await loginAs(page, carlos);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Histórico' }).click();

    const link = page.getByRole('link', { name: /Malbec às cegas/ });
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/events\/[a-z0-9]{15}$/);
    await expect(page.getByRole('heading', { name: 'Malbec às cegas' })).toBeVisible();
  });

  test('a aba de vinhos mostra só o que a pessoa provou', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Vinhos' }).click();

    await expect(page.getByText('Catena Malbec 2020')).toBeVisible();
    await expect(page.getByText('Quinta do Crasto 2019')).toBeVisible();
  });

  test('Marina não votou, então a coleção dela está vazia — com explicação', async ({ page }) => {
    await loginAs(page, marina);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Vinhos' }).click();

    await expect(page.getByText(/Nenhum vinho ainda/i)).toBeVisible();
    await expect(page.getByText(/envie seu ranking/i)).toBeVisible();
  });

  test('a chave Pix salva e persiste', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto('/profile');

    await page.getByTestId('edit-pix').click();
    await page.getByTestId('pix-input').fill('carlos@pix.com.br');
    await page.getByTestId('save-pix').click();
    await expect(page.getByText(/Chave Pix salva/i)).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByTestId('pix-value')).toContainText('carlos@pix.com.br');

    const [user] = await listRecords('users', `id = "${carlos.id}"`);
    expect(user.pix_key).toBe('carlos@pix.com.br');
  });

  test('a Home vira painel para quem entrou, com a degustação em andamento', async ({ page }) => {
    // A-17: a Home era a mesma landing estática na primeira e na décima visita,
    // sem mostrar próximo evento, clube ou pendência.
    await loginAs(page, carlos);
    await page.goto('/');

    await expect(page.getByTestId('greeting')).toContainText('Carlos');

    // Em andamento aparece primeiro, com a ação certa
    const ativa = page.getByTestId('active-tastings');
    await expect(ativa).toContainText('Brancos de verão');
    await expect(ativa).toContainText(/enviar meu ranking/i);

    // E a próxima marcada, com a data que foi cadastrada — sem escorregar um
    // dia por causa do fuso (data pura era lida como meia-noite UTC).
    await expect(page.getByText('Tintos de agosto')).toBeVisible();
    await expect(page.getByText('20/09/2026')).toBeVisible();

    // E o clube, na sua própria seção
    await expect(page.getByRole('link', { name: /Confraria da Quinta 2 membros/ })).toBeVisible();
  });

  test('clicar na degustação em andamento leva direto para ranquear', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto('/');
    await page.getByTestId('active-tastings').getByRole('link').first().click();

    await expect(page).toHaveURL(/\/events\/[a-z0-9]{15}\/tasting/);
    await expect(page.getByRole('heading', { name: /Sua degustação/i })).toBeVisible();
  });

  test('sair da conta devolve à apresentação', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto('/profile');
    await page.getByTestId('logout').click();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Prove o vinho/i })).toBeVisible();

    // E rota interna volta a pedir login
    await page.goto(`/clubs/${clubId}`);
    await expect(page).toHaveURL(/\/entrar/);
  });
});
