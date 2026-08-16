import { test, expect } from '@playwright/test';
import {
  resetDatabase, createUser, loginAs, uniqueEmail, listRecords, newPersonContext,
} from '../helpers.mjs';

/**
 * Cenário 2 — Montar o grupo
 *
 * Carlos cria o clube e manda o link. Marina entra por ele. Cobre o achado
 * A-13 (ninguém via o nome de ninguém) e A-14 (entrar exigia permissão de
 * escrita no clube inteiro).
 */
test.describe('Cenário 2 — Clube e convite', () => {
  let carlos, marina, clubId;

  test.beforeAll(async () => {
    await resetDatabase();
    carlos = await createUser({ email: uniqueEmail('carlos'), name: 'Carlos Mendes' });
    marina = await createUser({ email: uniqueEmail('marina'), name: 'Marina Silva' });
  });

  test('dono cria o clube e aparece como membro', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto('/clubs/new');

    await page.getByTestId('club-name').fill('Confraria da Quinta');
    await page.getByTestId('club-description').fill('Degustação às cegas toda quinta');
    // O clube não escolhe modo de degustação: isso é decisão de cada evento.
    await expect(page.getByTestId('club-type-blind')).toHaveCount(0);
    await page.getByTestId('save-club').click();

    await page.waitForURL(/\/clubs\/[a-z0-9]{15}/, { timeout: 15000 });
    clubId = page.url().split('/clubs/')[1].split('/')[0];

    await expect(page.getByRole('heading', { name: 'Confraria da Quinta' })).toBeVisible();
    // A-13: o nome resolve via wc_profiles. Antes mostrava "Members (1)" mesmo
    // com o clube cheio, porque users só deixava você ler o próprio registro.
    await expect(page.getByText('Carlos Mendes')).toBeVisible();
  });

  test('Marina entra pelo link de convite', async ({ browser }) => {
    const { context, page } = await newPersonContext(browser);
    await loginAs(page, marina);

    await page.goto(`/join/${clubId}`);
    await expect(page.getByRole('heading', { name: /Confraria da Quinta/ })).toBeVisible();

    await page.getByRole('button', { name: /entrar no clube/i }).click();
    await page.waitForURL(new RegExp(`/clubs/${clubId}`), { timeout: 15000 });

    const clubs = await listRecords('wc_clubs', `id = "${clubId}"`);
    expect(clubs[0].members).toContain(marina.id);
    expect(clubs[0].members).toContain(carlos.id);

    await context.close();
  });

  test('os dois se enxergam na lista de membros', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/clubs/${clubId}`);

    await expect(page.getByText('Carlos Mendes')).toBeVisible();
    await expect(page.getByText('Marina Silva')).toBeVisible();
    await expect(page.getByText(/Members \(2\)|Membros \(2\)/i)).toBeVisible();
  });

  test('criar um evento inteiro pela interface', async ({ page }) => {
    // Os outros cenários montam eventos pela API por velocidade — e foi
    // justamente por isso que o formulário passou meses com rótulo em inglês e
    // sem label associada ao campo, quebrando quem usa leitor de tela. Este
    // teste percorre o caminho que a pessoa percorre.
    await loginAs(page, carlos);
    await page.goto(`/clubs/${clubId}/events/new`);

    await expect(page.getByLabel(/nome do evento/i)).toBeVisible();
    await page.getByTestId('event-name').fill('Degustação de sexta');
    await page.getByTestId('event-date').fill('2026-09-20');
    await page.getByTestId('event-type-blind').click();

    // Um vinho escolhido na lista de sugestões do catálogo...
    await page.getByTestId('wine-input').fill('chateau marg');
    await expect(page.getByTestId('sugestao-0')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('sugestao-0').click();
    await expect(page.getByText(/Château Margaux/).first()).toBeVisible();

    // ...e outro que não existe no catálogo, digitado à mão
    await page.getByTestId('wine-input').fill('Vinho da Casa 2024');
    await page.getByTestId('wine-add').click();
    await expect(page.getByText('Vinho da Casa 2024')).toBeVisible({ timeout: 20000 });

    await page.getByTestId('save-event').click();
    await page.waitForURL(/\/events\/[a-z0-9]{15}/, { timeout: 20000 });

    const [evt] = await listRecords('wc_events', `title = "Degustação de sexta"`);
    expect(evt.participants).toHaveLength(2);
    expect(evt.wines).toHaveLength(2);
    expect(evt.type).toBe('blind');
    // A data não pode escorregar um dia por causa do fuso
    expect(evt.date).toContain('2026-09-20');

    await expect(page.getByRole('heading', { name: 'Degustação de sexta' })).toBeVisible();
    await expect(page.getByTestId('start-tasting')).toBeVisible();
  });

  test('quem não é dono não consegue apagar o clube pela API', async ({ page }) => {
    // A-12: as regras estavam em `@request.auth.id != ""`, então qualquer
    // pessoa logada podia excluir o clube de qualquer outra. A UI escondia o
    // botão; a API não escondia nada. Aqui vamos direto na API.
    await loginAs(page, marina);

    const result = await page.evaluate(async (id) => {
      const raw = localStorage.getItem('pocketbase_auth');
      const token = raw ? JSON.parse(raw).token : '';
      const res = await fetch(`${window.__PB_URL__ || 'http://127.0.0.1:8091'}/api/collections/wc_clubs/records/${id}`, {
        method: 'DELETE', headers: { Authorization: token },
      });
      return res.status;
    }, clubId);

    expect([403, 404]).toContain(result);
    const still = await listRecords('wc_clubs', `id = "${clubId}"`);
    expect(still).toHaveLength(1);
  });
});
