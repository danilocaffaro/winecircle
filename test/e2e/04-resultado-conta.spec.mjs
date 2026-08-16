import { test, expect } from '@playwright/test';
import {
  resetDatabase, createUser, setPixKey, loginAs, uniqueEmail,
  listRecords, newPersonContext, adminAuth, PB_URL,
} from '../helpers.mjs';

/**
 * Cenário 4 — Revelação e acerto de contas
 *
 * Depois da degustação: quem ganhou, quem deve a quem, e — o ponto que nunca
 * funcionou — se o devedor ainda enxerga a dívida ao abrir o link no dia
 * seguinte.
 *
 * Cobre A-07 (o rateio sumia no reload), A-08 (duplicava a cada clique) e
 * A-20 (a revelação anunciava vencedor sem votos).
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
  { id: 'w0', name: 'Catena Malbec 2020', type: 'red' },
  { id: 'w1', name: 'Quinta do Crasto 2019', type: 'red' },
  { id: 'w2', name: 'Cono Sur Pinot 2021', type: 'red' },
];

test.describe('Cenário 4 — Resultado e divisão da conta', () => {
  let carlos, marina, pedro, event;

  test.beforeAll(async () => {
    await resetDatabase();
    carlos = await createUser({ email: uniqueEmail('carlos'), name: 'Carlos Mendes' });
    marina = await createUser({ email: uniqueEmail('marina'), name: 'Marina Silva' });
    pedro = await createUser({ email: uniqueEmail('pedro'), name: 'Pedro Almeida' });
    await setPixKey(marina.id, 'marina@pix.com.br');

    const club = await apiPost('wc_clubs', {
      name: 'Confraria E2E', owner: carlos.id,
      members: [carlos.id, marina.id, pedro.id], type: 'open',
    });
    event = await apiPost('wc_events', {
      title: 'Tintos de terça', club: club.id, date: new Date().toISOString(),
      type: 'open', status: 'completed', wines: WINES,
      participants: [carlos.id, marina.id, pedro.id], created_by: carlos.id,
    });

    // Votos: w1 vence (1º de Carlos e Marina), w0 fica em 2º.
    const votos = [
      [carlos.id, [1, 0, 2]],
      [marina.id, [1, 2, 0]],
      [pedro.id, [0, 1, 2]],
    ];
    for (const [user, ordem] of votos) {
      for (let pos = 0; pos < ordem.length; pos++) {
        await apiPost('wc_ratings', {
          event: event.id, user, wine_index: ordem[pos], rank: pos + 1,
          stars: 5 - pos, note_aroma: pos === 0 ? 'Frutas maduras' : '',
        });
      }
    }
  });

  test('a revelação mostra o vencedor certo pela contagem de Borda', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/results`);

    await page.getByTestId('reveal-winner').click();

    // w1 = Quinta do Crasto: 3 + 3 + 2 = 8 pontos, contra 3+1+3 = 7 do w0.
    const winner = page.getByTestId('winner-card');
    await expect(winner).toBeVisible();
    await expect(winner).toContainText('Quinta do Crasto 2019');
    await expect(winner).toContainText('8');

    await expect(page.getByText(/2 votos em 1º lugar/i)).toBeVisible();
  });

  test('a tabela mostra como cada pessoa votou', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/results`);
    await page.getByTestId('reveal-winner').click();

    await expect(page.getByText('Voto a voto')).toBeVisible({ timeout: 15000 });
    // A-13 de novo: os nomes precisam resolver via wc_profiles
    await expect(page.getByRole('columnheader', { name: 'Marina' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Pedro' })).toBeVisible();
  });

  test('evento sem votos não inventa um vencedor', async ({ page }) => {
    // A-20: antes, com zero rankings a tela avisava "complete a degustação
    // primeiro" e mantinha o botão ativo, revelando com pódio e animação o
    // primeiro vinho da lista, com 0 pontos.
    const club = await apiPost('wc_clubs', {
      name: 'Clube vazio', owner: carlos.id, members: [carlos.id], type: 'open',
    });
    const vazio = await apiPost('wc_events', {
      title: 'Sem votos', club: club.id, date: new Date().toISOString(),
      type: 'open', status: 'completed', wines: WINES,
      participants: [carlos.id], created_by: carlos.id,
    });

    await loginAs(page, carlos);
    await page.goto(`/events/${vazio.id}/results`);

    await expect(page.getByText(/Ainda não há votos/i)).toBeVisible();
    await expect(page.getByTestId('reveal-winner')).toHaveCount(0);
    await expect(page.getByTestId('winner-card')).toHaveCount(0);
  });

  test('Carlos lança a conta e o rateio é calculado', async ({ page }) => {
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/expenses`);

    // Conta de R$300: Marina pagou tudo, então cada um deve R$100 a ela.
    await page.getByTestId('total-cost').fill('300');
    await page.getByTestId(`paid-${marina.id}`).fill('300');
    await expect(page.getByTestId('total-paid')).toContainText('300');

    await page.getByTestId('save-split').click();
    await expect(page.getByText(/Divisão salva/i)).toBeVisible({ timeout: 15000 });

    const pagamentos = await listRecords('wc_payments');
    expect(pagamentos).toHaveLength(2);
    for (const p of pagamentos) {
      expect(p.creditor).toBe(marina.id);
      expect(p.amount).toBeCloseTo(100, 2);
      expect(p.status).toBe('pending');
      // A chave Pix vai junto no momento do acerto, para o devedor conseguir pagar
      expect(p.pix_key).toBe('marina@pix.com.br');
    }
  });

  test('recalcular não duplica os pagamentos', async ({ page }) => {
    // A-08: cada clique em "Calcular" criava despesa e pagamentos novos;
    // marcar um como pago deixava o gêmeo pendente para sempre.
    await loginAs(page, carlos);
    await page.goto(`/events/${event.id}/expenses`);

    await page.getByTestId('edit-split').click();
    await page.getByTestId('total-cost').fill('300');
    await page.getByTestId(`paid-${marina.id}`).fill('300');
    await page.getByTestId('save-split').click();
    await expect(page.getByText(/Divisão salva/i)).toBeVisible({ timeout: 15000 });

    expect(await listRecords('wc_expenses')).toHaveLength(1);
    expect(await listRecords('wc_payments')).toHaveLength(2);
  });

  test('Pedro abre o link depois e ainda vê a dívida', async ({ browser }) => {
    // A-07: o rateio vivia só em useState e o painel de transferências só
    // renderizava sob `calculated`. Quem abria a página numa sessão nova — o
    // devedor, justamente — encontrava um formulário zerado e nenhum jeito de
    // marcar "paguei". O screenshot F9-01 do E2E antigo se chamava
    // "pedro-sees-debt" e mostrava R$0,00.
    const { context, page } = await newPersonContext(browser);
    await loginAs(page, pedro);
    await page.goto(`/events/${event.id}/expenses`);

    await expect(page.getByTestId('my-summary')).toContainText('Você deve');
    await expect(page.getByTestId('my-summary')).toContainText('100');
    await expect(page.getByTestId('my-summary')).toContainText('Marina Silva');

    // E consegue agir
    const pagamentos = await listRecords('wc_payments', `debtor = "${pedro.id}"`);
    await expect(page.getByTestId(`mark-paid-${pagamentos[0].id}`)).toBeVisible();

    // A chave Pix aparece para quem precisa pagar
    await expect(page.getByText('marina@pix.com.br')).toBeVisible();

    await context.close();
  });

  test('Pedro paga, Marina confirma', async ({ browser }) => {
    const pagamento = (await listRecords('wc_payments', `debtor = "${pedro.id}"`))[0];

    const devedor = await newPersonContext(browser);
    await loginAs(devedor.page, pedro);
    await devedor.page.goto(`/events/${event.id}/expenses`);
    await devedor.page.getByTestId(`mark-paid-${pagamento.id}`).click();
    await expect(devedor.page.getByText(/Marcado como pago/i)).toBeVisible({ timeout: 15000 });
    await expect(devedor.page.getByText(/Aguardando Marina Silva confirmar/i)).toBeVisible();
    await devedor.context.close();

    const credor = await newPersonContext(browser);
    await loginAs(credor.page, marina);
    await credor.page.goto(`/events/${event.id}/expenses`);
    await expect(credor.page.getByTestId('my-summary')).toContainText('Pedro Almeida');
    await credor.page.getByTestId(`confirm-${pagamento.id}`).click();
    await expect(credor.page.getByText(/Recebimento confirmado/i)).toBeVisible({ timeout: 15000 });
    await credor.context.close();

    const [final] = await listRecords('wc_payments', `id = "${pagamento.id}"`);
    expect(final.status).toBe('confirmed');
    expect(final.confirmed_at).toBeTruthy();
  });

  test('quem não lançou a conta não consegue editá-la', async ({ browser }) => {
    const { context, page } = await newPersonContext(browser);
    await loginAs(page, pedro);
    await page.goto(`/events/${event.id}/expenses`);

    await expect(page.getByTestId('edit-split')).toHaveCount(0);
    await context.close();
  });
});
