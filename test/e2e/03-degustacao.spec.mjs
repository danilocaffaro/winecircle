import { test, expect } from '@playwright/test';
import {
  resetDatabase, createUser, loginAs, uniqueEmail, listRecords,
  newPersonContext, adminAuth, PB_URL,
} from '../helpers.mjs';

/**
 * Cenário 3 — A degustação
 *
 * O coração do produto, e a parte que nunca funcionou: três pessoas em três
 * dispositivos ranqueiam os mesmos quatro vinhos às cegas.
 *
 * Cobre A-03 (participantes sumiam), A-09 ("todos enviaram" com zero pessoas),
 * A-10 (rankings se sobrescreviam), A-15 (um aparelho votava por todos),
 * A-16 (o rótulo cego mudava ao arrastar) e A-04 (evento não fechava).
 */

const WINES = [
  { name: 'Catena Malbec 2020', producer: 'Catena Zapata' },
  { name: 'Quinta do Crasto 2019', producer: 'Crasto' },
  { name: 'Marqués de Cáceres 2018', producer: 'Cáceres' },
  { name: 'Cono Sur Pinot Noir 2021', producer: 'Cono Sur' },
];

/** Cria clube + evento pela API: o caminho da UI já é coberto no cenário 2. */
async function seedEvent(participants, owner, type = 'blind') {
  const token = await adminAuth();
  const post = async (coll, body) => {
    const r = await fetch(`${PB_URL}/api/collections/${coll}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${coll}: ${r.status} ${await r.text()}`);
    return r.json();
  };

  const club = await post('wc_clubs', {
    name: 'Confraria E2E', description: 'Grupo de teste',
    owner: owner.id, members: participants.map((p) => p.id), type: 'blind',
  });

  const event = await post('wc_events', {
    title: 'Malbec às cegas',
    club: club.id,
    date: new Date().toISOString(),
    type,
    status: 'tasting',
    wines: WINES.map((w, i) => ({ ...w, id: `wine-${i}`, type: 'red' })),
    participants: participants.map((p) => p.id),
    created_by: owner.id,
  });

  return { club, event };
}

/**
 * Reordena pelos botões de subir/descer.
 *
 * A suíte anterior pulava esta etapa inteira — "DnD is hard to automate
 * reliably" — o que significa que o gesto central do app nunca foi testado.
 * Os botões existem justamente porque arrastar não pode ser o único caminho:
 * servem a teclado e leitor de tela, e de quebra tornam o ranking testável.
 */
async function moveWineDown(page, wineIndex, times = 1) {
  for (let i = 0; i < times; i++) {
    await page.getByTestId(`move-down-${wineIndex}`).click();
    await page.waitForTimeout(100);
  }
}

test.describe('Cenário 3 — Degustação às cegas, três dispositivos', () => {
  let carlos, marina, pedro, event;

  test.beforeAll(async () => {
    await resetDatabase();
    carlos = await createUser({ email: uniqueEmail('carlos'), name: 'Carlos Mendes' });
    marina = await createUser({ email: uniqueEmail('marina'), name: 'Marina Silva' });
    pedro = await createUser({ email: uniqueEmail('pedro'), name: 'Pedro Almeida' });
    ({ event } = await seedEvent([carlos, marina, pedro], carlos));
  });

  test('o evento nasce com os participantes gravados', async () => {
    // A-03: `participants` não existia no schema, o PocketBase descartava a
    // chave em silêncio e todo evento nascia vazio.
    const [saved] = await listRecords('wc_events', `id = "${event.id}"`);
    expect(saved.participants).toHaveLength(3);
    expect(saved.participants).toContain(marina.id);
  });

  test('a degustação abre com o progresso real do grupo, não "todos enviaram"', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/tasting`);

    // A-09: com a lista de participantes vazia, `0 >= 0` era verdadeiro e a
    // tela abria direto em "All Rankings Submitted!" sem ninguém ter votado.
    await expect(page.getByText('0/3')).toBeVisible();
    await expect(page.getByText(/Todos enviaram/i)).toHaveCount(0);

    // Os quatro vinhos aparecem para ordenar
    await expect(page.locator('[data-testid^="rank-item-"]')).toHaveCount(4);
  });

  test('em modo cego o rótulo não revela o vinho', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/tasting`);

    await expect(page.getByText('Vinho A')).toBeVisible();
    await expect(page.getByText('Catena Malbec 2020')).toHaveCount(0);
  });

  test('o rótulo cego não muda quando você reordena', async ({ page }) => {
    // A-16: o rótulo vinha do índice na lista *já reordenada*, então o vinho A
    // virava B assim que você arrastava um card — e as notas ficavam presas a
    // um identificador que não parava quieto.
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/tasting`);

    const first = page.locator('[data-testid^="rank-item-"]').first();
    await expect(first).toContainText('Vinho A');

    await moveWineDown(page, 0, 1);

    // "Vinho A" continua existindo exatamente uma vez, agora na 2ª posição
    await expect(page.getByText('Vinho A', { exact: true })).toHaveCount(1);
    const second = page.locator('[data-testid^="rank-item-"]').nth(1);
    await expect(second).toContainText('Vinho A');
  });

  test('cada pessoa envia o próprio ranking, do próprio dispositivo', async ({ browser }) => {
    // A-15: antes, um único aparelho percorria currentMemberIndex e enviava o
    // ranking de todo mundo, sem checar identidade.
    const people = [
      { user: carlos, moves: 0 },  // mantém a ordem: A B C D
      { user: marina, moves: 1 },  // desce o A uma posição: B A C D
      { user: pedro, moves: 2 },   // desce o A duas: B C A D
    ];

    for (const { user, moves } of people) {
      const { context, page } = await newPersonContext(browser);
      await loginAs(page, user);
      await page.goto(`/events/${event.id}/tasting`);
      await expect(page.locator('[data-testid^="rank-item-"]')).toHaveCount(4);

      if (moves > 0) await moveWineDown(page, 0, moves);

      await page.getByTestId('submit-ranking').click();
      await expect(page.getByText(/Seu ranking foi enviado|Atualizar meu ranking/i).first())
        .toBeVisible({ timeout: 15000 });

      await context.close();
    }

    // Uma linha por (pessoa, vinho): 3 x 4 = 12. Nenhuma sobrescrita.
    const ratings = await listRecords('wc_ratings', `event = "${event.id}"`);
    expect(ratings).toHaveLength(12);

    const porPessoa = new Set(ratings.map((r) => r.user));
    expect(porPessoa.size).toBe(3);

    // A-10: o ranking de Carlos sobreviveu aos envios de Marina e Pedro.
    const doCarlos = ratings.filter((r) => r.user === carlos.id).sort((a, b) => a.rank - b.rank);
    expect(doCarlos.map((r) => r.wine_index)).toEqual([0, 1, 2, 3]);

    const daMarina = ratings.filter((r) => r.user === marina.id).sort((a, b) => a.rank - b.rank);
    expect(daMarina.map((r) => r.wine_index)).toEqual([1, 0, 2, 3]);
  });

  test('reenviar atualiza em vez de duplicar', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/tasting`);

    // Reidrata o que ele já mandou
    await expect(page.getByTestId('submit-ranking')).toContainText(/Atualizar/i);

    await moveWineDown(page, 0, 3);
    await page.getByTestId('submit-ranking').click();
    await expect(page.getByText(/Ranking atualizado/i)).toBeVisible({ timeout: 15000 });

    // Continua 12 — o índice único (event, user, wine_index) garante o upsert
    const ratings = await listRecords('wc_ratings', `event = "${event.id}"`);
    expect(ratings).toHaveLength(12);

    const doCarlos = ratings.filter((r) => r.user === carlos.id).sort((a, b) => a.rank - b.rank);
    expect(doCarlos.map((r) => r.wine_index)).toEqual([1, 2, 3, 0]);
  });

  test('quem não é do clube é barrado pelo backend, e a tela explica', async ({ browser }) => {
    // Dupla proteção: as regras do PocketBase escondem o evento (o cliente nem
    // consegue lê-lo), e a tela traduz esse 404 em algo acionável em vez de um
    // "não encontrado" que faz a pessoa procurar erro de digitação.
    const intruso = await createUser({ email: uniqueEmail('intruso'), name: 'João Estranho' });
    const { context, page } = await newPersonContext(browser);
    await loginAs(page, intruso);
    await page.goto(`/events/${event.id}/tasting`);

    await expect(page.getByRole('heading', { name: /Você não está nesta degustação/i })).toBeVisible();
    await expect(page.getByText(/clube do qual você não faz parte/i)).toBeVisible();
    await expect(page.getByTestId('submit-ranking')).toHaveCount(0);
    await context.close();
  });

  test('com todos prontos, quem organiza revela e o evento fecha', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/tasting`);

    await expect(page.getByText('3/3')).toBeVisible();
    await expect(page.getByTestId('reveal-results')).toBeVisible();

    await page.getByTestId('reveal-results').click();
    await page.waitForURL(new RegExp(`/events/${event.id}/results`), { timeout: 15000 });

    // A-04: 'completed' não estava no enum, então nenhum evento jamais fechava
    // e os botões de resultado e conta nunca apareciam.
    const [saved] = await listRecords('wc_events', `id = "${event.id}"`);
    expect(saved.status).toBe('completed');
  });
});
