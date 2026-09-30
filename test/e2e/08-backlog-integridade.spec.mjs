import { test, expect } from '@playwright/test';
import { api, adminAuth, resetDatabase, createUser, uniqueEmail, loginAs, listRecords, PB_URL } from '../helpers.mjs';

const WINES = [0, 1, 2].map((i) => ({ id: `w${i}`, name: `Garrafa secreta ${i}`, producer: 'Produtor secreto', type: 'red' }));
async function token(user) {
  return (await api('/api/collections/users/auth-with-password', { method: 'POST', body: { identity: user.email, password: user.password } })).token;
}
async function fixture() {
  await resetDatabase();
  const admin = await adminAuth();
  const owner = await createUser({ email: uniqueEmail('owner'), name: 'Mariana' });
  const person = await createUser({ email: uniqueEmail('person'), name: 'Joana' });
  const club = await api('/api/collections/wc_clubs/records', { method: 'POST', token: admin,
    body: { name: 'Clube do convite', owner: owner.id, members: [owner.id, person.id] } });
  const event = await api('/api/collections/wc_events/records', { method: 'POST', token: admin,
    body: { title: 'Evento protegido', club: club.id, created_by: owner.id, participants: [owner.id, person.id],
      wines: WINES, date: '2026-09-30', type: 'blind', status: 'tasting' } });
  return { owner, person, club, event, admin, ownerToken: await token(owner), personToken: await token(person) };
}
const ranking = (event, tok, order = [0, 1, 2], notes = {}) =>
  api('/api/wc/ranking', { method: 'POST', token: tok, body: { event: event.id, order, notes } });

test.describe('Backlog — convite e integridade com PocketBase real', () => {
  let f;
  test.beforeEach(async () => { f = await fixture(); });

  for (const mode of ['register', 'login']) {
    test(`convite chega ao clube depois de ${mode === 'register' ? 'criar conta' : 'entrar'}`, async ({ page }) => {
      const newcomer = mode === 'login'
        ? await createUser({ email: uniqueEmail('invite'), name: 'Convidada' })
        : { email: uniqueEmail('register'), name: 'Convidada', password: 'SenhaTeste123' };
      await page.goto(`/join/${f.club.id}?t=${f.club.invite_token}`);
      await expect(page.getByRole('heading', { name: f.club.name })).toBeVisible();
      await expect(page.getByRole('navigation')).toHaveCount(0);
      await page.getByRole('button', { name: mode === 'register' ? 'Criar conta e entrar' : 'Já tenho conta', exact: true }).click();
      if (mode === 'register') await page.getByTestId('name').fill(newcomer.name);
      await page.getByTestId('email').fill(newcomer.email);
      await page.getByTestId('password').fill(newcomer.password);
      await page.getByTestId('submit').click();
      await expect(page).toHaveURL(new RegExp(`/clubs/${f.club.id}$`));
      await expect(page.getByText('Convidada', { exact: true })).toBeVisible();
      const [club] = await listRecords('wc_clubs', `id = "${f.club.id}"`);
      expect(club.members).toHaveLength(3);
    });
  }

  test('destino protegido sobrevive a uma nova abertura da página de login', async ({ page }) => {
    await page.goto(`/clubs/${f.club.id}`);
    await expect(page).toHaveURL(/\/entrar/);
    await page.goto('/entrar');
    await page.locator('[data-testid="header-login"], [data-testid="dock-login"]').filter({ visible: true }).first().click();
    await page.getByTestId('email').fill(f.person.email);
    await page.getByTestId('password').fill(f.person.password);
    await page.getByTestId('submit').click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${f.club.id}$`));
  });

  test('identidades e notas alheias ficam ocultas até o encerramento', async () => {
    await ranking(f.event, f.ownerToken);
    const event = await api(`/api/collections/wc_events/records/${f.event.id}`, { token: f.personToken });
    expect(JSON.stringify(event.wines)).not.toMatch(/Garrafa secreta|Produtor secreto/);
    const notes = await api(`/api/collections/wc_ratings/records?filter=${encodeURIComponent(`event="${f.event.id}"`)}`, { token: f.personToken });
    expect(notes.items).toHaveLength(0);
    const [rating] = await listRecords('wc_ratings', `event="${f.event.id}"`);
    await expect(api(`/api/collections/wc_ratings/records/${rating.id}`, { token: f.personToken })).rejects.toMatchObject({ status: 404 });
    const progress = await api(`/api/wc/event-progress?event=${f.event.id}`, { token: f.personToken });
    expect(progress.submitted).toEqual([f.owner.id]);
    expect(Object.keys(progress).sort()).toEqual(['status', 'submitted']);
    for (const [collection, filter] of [
      ['wc_events', `id="${f.event.id}" && wines ~ "Garrafa secreta"`],
      ['wc_clubs', `id="${f.club.id}" && wc_events_via_club.wines ~ "Garrafa secreta"`],
    ]) {
      await expect(api(`/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}`, { token: f.personToken })).rejects.toMatchObject({ status: 400 });
    }
  });

  test('resultado durante a votação redireciona sem mostrar vencedor', async ({ page }) => {
    await ranking(f.event, f.ownerToken);
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/results`);
    await expect(page).toHaveURL(new RegExp(`/events/${f.event.id}$`));
    await expect(page.getByTestId('winner-card')).toHaveCount(0);
    await expect(page.getByTestId('start-tasting')).toHaveCount(0);
  });

  test('envio inválido não grava parte do ranking nem altera um ranking existente', async () => {
    await expect(ranking(f.event, f.personToken, [0, 1, 2], { 2: { stars: 9 } })).rejects.toMatchObject({ status: 400 });
    expect(await listRecords('wc_ratings', `event="${f.event.id}"`)).toHaveLength(0);
    await ranking(f.event, f.personToken);
    await expect(ranking(f.event, f.personToken, [2, 1, 0], { 0: { aroma: 'x'.repeat(501) } })).rejects.toMatchObject({ status: 400 });
    const rows = await listRecords('wc_ratings', `event="${f.event.id}"`);
    expect(rows.sort((a,b) => a.rank-b.rank).map((r) => r.wine_index)).toEqual([0, 1, 2]);
    await expect(ranking(f.event, f.personToken, [0, 0, 2])).rejects.toMatchObject({ status: 400 });
  });

  test('encerramento bloqueia reenviar, editar ou apagar votos e reabrir evento', async ({ page }) => {
    await ranking(f.event, f.personToken);
    await api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.ownerToken, body: { status: 'completed' } });
    await expect(ranking(f.event, f.personToken)).rejects.toMatchObject({ status: 400 });
    const [row] = await listRecords('wc_ratings', `event="${f.event.id}"`);
    for (const method of ['PATCH', 'DELETE']) {
      await expect(api(`/api/collections/wc_ratings/records/${row.id}`, { method, token: f.personToken, body: method === 'PATCH' ? { rank: 2 } : undefined })).rejects.toMatchObject({ status: 403 });
    }
    await expect(api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.ownerToken, body: { status: 'tasting' } })).rejects.toMatchObject({ status: 400 });
    await expect(api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.ownerToken, body: { 'status+': 'tasting' } })).rejects.toMatchObject({ status: 400 });
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/tasting`);
    await expect(page).toHaveURL(new RegExp(`/events/${f.event.id}/results$`));
    await expect(page.getByTestId('submit-ranking')).toHaveCount(0);
  });

  test('vinhos e participantes não mudam depois do início, inclusive pela API', async () => {
    const outsider = await createUser({ email: uniqueEmail('append'), name: 'Outra pessoa' });
    for (const body of [{ wines: [...WINES].reverse() }, { participants: [f.owner.id] }, { 'participants-': [f.person.id] }, { '+participants': [outsider.id] }]) {
      // Unsupported/no-op modifiers may be ignored by PocketBase; neither a
      // successful response nor a refusal may change the canonical arrays.
      try { await api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.ownerToken, body }); }
      catch (error) { expect(error.status).toBe(400); }
      const saved = await api(`/api/collections/wc_events/records/${f.event.id}`, { token: f.ownerToken });
      expect(saved.wines).toEqual(WINES);
      expect(saved.participants).toEqual([f.owner.id, f.person.id]);
    }
  });

  test('gabarito oculto aceita criação e edição pelo organizador antes do início', async () => {
    const event = await api('/api/collections/wc_events/records', { method: 'POST', token: f.ownerToken,
      body: { title: 'Próxima degustação', club: f.club.id, created_by: f.owner.id,
        participants: [f.owner.id, f.person.id], wines: WINES, date: '2026-10-01', type: 'blind', status: 'upcoming' } });
    expect(event.wines).toEqual(WINES);
    const saved = await api(`/api/collections/wc_events/records/${event.id}`, { method: 'PATCH', token: f.ownerToken, body: { wines: WINES.slice(0, 2) } });
    expect(saved.wines).toEqual(WINES.slice(0, 2));
    const publicEvent = await api(`/api/collections/wc_events/records/${event.id}`, { token: f.personToken });
    expect(JSON.stringify(publicEvent.wines)).not.toContain('Garrafa secreta');
  });

  test('organizador fora dos participantes consegue encerrar sem votos e sem ciclo de navegação', async ({ page }) => {
    await api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.admin, body: { participants: [f.person.id] } });
    await loginAs(page, f.owner);
    await page.goto(`/events/${f.event.id}/tasting`);
    await expect(page.getByTestId('submit-ranking')).toHaveCount(0);
    page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('Joana'); await dialog.accept(); });
    await page.getByTestId('reveal-results').click();
    await expect(page).toHaveURL(new RegExp(`/events/${f.event.id}/results$`));
    await expect(page.getByRole('heading', { name: 'Degustação encerrada sem votos' })).toBeVisible();
    await page.getByRole('link', { name: /Voltar ao evento/ }).last().click();
    await expect(page).toHaveURL(new RegExp(`/events/${f.event.id}$`));
  });

  test('ações de ranking ficam visíveis e os ícones usados viram glifos', async ({ page }) => {
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/tasting`);
    const button = page.getByTestId('submit-ranking');
    await expect(button).toBeVisible();
    const bounds = await button.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
    const arrow = await page.getByTestId('move-down-0').boundingBox();
    expect(arrow.width).toBeGreaterThanOrEqual(44);
    expect(arrow.height).toBeGreaterThanOrEqual(44);
    const malformed = await page.evaluate(async () => {
      await document.fonts.load('24px "Material Symbols Rounded"');
      return [...document.querySelectorAll('.material-symbols-rounded')].filter((el) =>
        el.getBoundingClientRect().width > parseFloat(getComputedStyle(el).fontSize) * 1.5
      ).map((el) => el.textContent.trim());
    });
    expect(malformed).toEqual([]);
  });

  test('duas pessoas entram simultaneamente e nenhuma desaparece', async () => {
    const people = await Promise.all([1,2].map((i) => createUser({ email: uniqueEmail(`join${i}`), name: `Convidado ${i}` })));
    await Promise.all(people.map(async (p) => api('/api/wc/join', { method: 'POST', token: await token(p), body: { club: f.club.id, token: f.club.invite_token } })));
    const [club] = await listRecords('wc_clubs', `id="${f.club.id}"`);
    expect(club.members).toEqual(expect.arrayContaining(people.map((p) => p.id)));
    expect(club.members).toHaveLength(4);
  });

  test('atualizar metadados em paralelo ao encerramento nunca reabre o evento', async () => {
    const path = `/api/collections/wc_events/records/${f.event.id}`;
    await Promise.all([
      ...Array.from({ length: 8 }, (_, i) => api(path, { method: 'PATCH', token: f.ownerToken, body: { title: `Título ${i}` } })),
      api(path, { method: 'PATCH', token: f.ownerToken, body: { status: 'completed' } }),
    ]);
    const saved = await api(path, { token: f.ownerToken });
    expect(saved.status).toBe('completed');
    await expect(ranking(f.event, f.personToken)).rejects.toMatchObject({ status: 400 });
  });

  test('devedor não confirma, não troca valores nem pessoas; só o credor confirma', async () => {
    await api('/api/collections/wc_expenses/records', { method: 'POST', token: f.admin,
      body: { event: f.event.id, total_amount: 100, paid_by: f.owner.id, split_type: 'equal',
        splits: { contributions: [], transfers: [{ fromMemberId: f.person.id, toMemberId: f.owner.id, amount: 50 }] } } });
    const [payment] = await listRecords('wc_payments');
    await expect(api(`/api/collections/wc_payments/records/${payment.id}`, { method: 'PATCH', token: f.personToken, body: { status: 'confirmed' } })).rejects.toMatchObject({ status: 403 });
    for (const body of [{ amount: 1 }, { 'amount+': 1 }, { creditor: f.person.id }, { debtor: f.owner.id }, { pix_key: 'trocar' }]) {
      await expect(api(`/api/collections/wc_payments/records/${payment.id}`, { method: 'PATCH', token: f.personToken, body })).rejects.toMatchObject({ status: 400 });
    }
    const paid = await api(`/api/collections/wc_payments/records/${payment.id}`, { method: 'PATCH', token: f.personToken, body: { status: 'paid', paid_at: '2000-01-01' } });
    const repeated = await api(`/api/collections/wc_payments/records/${payment.id}`, { method: 'PATCH', token: f.personToken, body: { status: 'paid', paid_at: '2000-01-01', confirmed_at: '2000-01-01' } });
    expect(repeated.paid_at).toBe(paid.paid_at);
    expect(repeated.confirmed_at).toBe('');
    const final = await api(`/api/collections/wc_payments/records/${payment.id}`, { method: 'PATCH', token: f.ownerToken, body: { status: 'confirmed' } });
    expect(final.status).toBe('confirmed');
    expect(final.amount).toBe(50);
    expect(final.paid_at).not.toMatch(/^2000/);
    expect(final.confirmed_at).toBeTruthy();
  });

  test('repetições de pago em paralelo à confirmação não a desfazem', async () => {
    await api('/api/collections/wc_expenses/records', { method: 'POST', token: f.admin,
      body: { event: f.event.id, total_amount: 100, paid_by: f.owner.id, split_type: 'equal',
        splits: { contributions: [], transfers: [{ fromMemberId: f.person.id, toMemberId: f.owner.id, amount: 50 }] } } });
    const [payment] = await listRecords('wc_payments');
    const path = `/api/collections/wc_payments/records/${payment.id}`;
    await api(path, { method: 'PATCH', token: f.personToken, body: { status: 'paid' } });
    const responses = await Promise.allSettled([
      ...Array.from({ length: 8 }, () => api(path, { method: 'PATCH', token: f.personToken, body: { status: 'paid' } })),
      api(path, { method: 'PATCH', token: f.ownerToken, body: { status: 'confirmed' } }),
    ]);
    for (const response of responses) if (response.status === 'rejected') expect(response.reason.status).toBe(403);
    const saved = await api(path, { token: f.personToken });
    expect(saved.status).toBe('confirmed');
    expect(saved.confirmed_at).toBeTruthy();
  });

  test('rascunho de ranking sobrevive a recarregar', async ({ page }) => {
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/tasting`);
    await page.getByTestId('move-down-0').click();
    await expect(page.locator('[data-testid^="rank-item-"]').nth(1)).toContainText('Vinho A');
    await page.reload();
    await expect(page.locator('[data-testid^="rank-item-"]').nth(1)).toContainText('Vinho A');
    expect(await listRecords('wc_ratings')).toHaveLength(0);
  });

  test('rascunho de revisão também sobrevive depois de já ter enviado', async ({ page }) => {
    await ranking(f.event, f.personToken);
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/tasting`);
    await page.getByTestId('move-down-0').click();
    await expect(page.locator('[data-testid^="rank-item-"]').nth(1)).toContainText('Vinho A');
    await page.reload();
    await expect(page.locator('[data-testid^="rank-item-"]').nth(1)).toContainText('Vinho A');
    const rows = await listRecords('wc_ratings');
    expect(rows.find((row) => row.wine_index === 0).rank).toBe(1);
  });

  test('empate não inventa um único vencedor', async ({ page }) => {
    await ranking(f.event, f.ownerToken, [0, 1, 2]);
    await ranking(f.event, f.personToken, [2, 1, 0]);
    await api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.ownerToken, body: { status: 'completed' } });
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/results`);
    await page.getByTestId('reveal-winner').click();
    const winner = page.getByTestId('winner-card');
    await expect(winner).toContainText('Empate em 1º lugar');
    await expect(winner).toContainText('Garrafa secreta 0 · Garrafa secreta 2');
  });

  test('logout cancela a inscrição deste aparelho e remove seu vínculo no servidor', async ({ page }) => {
    const endpoint = 'https://example.invalid/push-device';
    await api('/api/collections/wc_push_subs/records', { method: 'POST', token: f.personToken,
      body: { user: f.person.id, endpoint, keys: { auth: 'test', p256dh: 'test' } } });
    await loginAs(page, f.person);
    await page.goto('/profile');
    await page.evaluate((endpoint) => {
      navigator.serviceWorker.getRegistration = async () => ({ pushManager: {
        getSubscription: async () => ({ endpoint, unsubscribe: async () => { window.pushCancelled = true; return true; } }),
      } });
    }, endpoint);
    await page.getByTestId('logout').click();
    await expect(page.getByTestId('logout')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Entre para ver seu perfil' })).toBeVisible();
    expect(await page.evaluate(() => window.pushCancelled)).toBe(true);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pocketbase_auth'))?.token || '')).toBe('');
    await expect.poll(async () => (await listRecords('wc_push_subs')).length).toBe(0);
  });

  test('participantes acompanham progresso e revelação sem recarregar', async ({ page }) => {
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/tasting`);
    await expect(page.getByText('0/2', { exact: true })).toBeVisible();
    await ranking(f.event, f.ownerToken);
    await expect(page.getByText('1/2', { exact: true })).toBeVisible();
    await api(`/api/collections/wc_events/records/${f.event.id}`, { method: 'PATCH', token: f.ownerToken, body: { status: 'completed' } });
    await expect(page).toHaveURL(new RegExp(`/events/${f.event.id}/results$`));
  });

  test('resposta atrasada de progresso não tira a pessoa da tela para onde foi', async ({ page }) => {
    await loginAs(page, f.person);
    await page.goto(`/events/${f.event.id}/tasting`);
    await expect(page.getByText('0/2', { exact: true })).toBeVisible();
    let pending;
    await page.route(`${PB_URL}/api/wc/event-progress?**`, (route) => {
      if (!pending) pending = route;
      else return route.abort();
    });
    await expect.poll(() => !!pending, { timeout: 5000 }).toBe(true);
    await page.locator('a[href="/clubs"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/clubs$/);
    await pending.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ submitted: [], status: 'completed' }) });
    // Exercise another SPA navigation after the delayed response was handled.
    await expect(page.getByRole('heading', { name: 'Meus clubes' })).toBeVisible();
    await page.getByText(f.club.name, { exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/clubs/${f.club.id}$`));
  });

  test('falha de servidor oferece tentar novamente sem dizer que o convite é inválido', async ({ page }) => {
    await page.route(`${PB_URL}/api/wc/invite?**`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Servidor indisponível' }) }));
    await page.goto(`/join/${f.club.id}?t=${f.club.invite_token}`);
    await expect(page.getByRole('heading', { name: 'Não deu para abrir o convite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible();
    await page.unroute(`${PB_URL}/api/wc/invite?**`);
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByRole('heading', { name: f.club.name })).toBeVisible();
  });
});
