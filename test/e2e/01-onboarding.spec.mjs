import { test, expect } from '@playwright/test';
import {
  resetDatabase, registerViaUI, uniqueEmail, countRecords, abrirFolhaAuth, BASE_URL,
} from '../helpers.mjs';

/**
 * Cenário 1 — Chegada
 *
 * Uma pessoa que nunca usou o app: o que ela vê antes de ter conta, e o que
 * encontra logo depois de criar uma.
 */
test.describe('Cenário 1 — Primeiro acesso', () => {
  test.beforeAll(async () => { await resetDatabase(); });

  test('visitante vê a proposta, não um app vazio', async ({ page }) => {
    await page.goto('/');

    // A landing explica o produto
    await expect(page.getByRole('heading', { name: /Prove o vinho/i })).toBeVisible();
    await expect(page.getByText(/Todo mundo ordena os vinhos no próprio celular/i)).toBeVisible();

    // Antes, "Browse without account" liberava telas que dependiam de sessão
    // e mostravam listas vazias. Agora rota interna manda para a entrada.
    await page.goto('/clubs');
    await expect(page).toHaveURL(/\/entrar/);

    // E a entrada é a apresentação, não um formulário nu: o carrossel mostra
    // uma tela por funcionalidade, e entrar fica na barra fixa do rodapé.
    await expect(page.getByRole('heading', { name: /Prove o vinho/i })).toBeVisible();
    await expect(page.getByLabel(/Como o Wine Circle funciona/i)).toBeVisible();
    // Entrar fica no cabeçalho em telas largas e na barra fixa no celular —
    // um dos dois está sempre visível, e o formulário só aparece ao pedir.
    const noCabecalho = await page.getByTestId('header-login').isVisible();
    const naBarra = await page.getByTestId('dock-login').isVisible();
    expect(noCabecalho || naBarra).toBe(true);
    await expect(page.getByTestId('submit')).toHaveCount(0);
  });

  test('o carrossel percorre as quatro funcionalidades', async ({ page }) => {
    await page.goto('/entrar');
    for (const [i, titulo] of [
      [0, /Chame o pessoal/i],
      [1, /Cada um no seu celular/i],
      [2, /O app apura/i],
      [3, /E divide a conta/i],
    ]) {
      await page.getByTestId(`slide-${i}`).click();
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    }
  });

  test('a folha de entrar abre, troca de modo e fecha', async ({ page }) => {
    await page.goto('/entrar');
    await abrirFolhaAuth(page, 'login');
    await expect(page.getByTestId('submit')).toBeVisible();

    await page.getByTestId('tab-register').click();
    await expect(page.getByTestId('name')).toBeVisible();

    await page.getByTestId('auth-close').click();
    await expect(page.getByTestId('auth-sheet')).toHaveCount(0);

    // Escape também fecha
    await abrirFolhaAuth(page, 'login');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('auth-sheet')).toHaveCount(0);
  });

  test('cria conta e cai num painel que sabe que está vazio', async ({ page }) => {
    const email = uniqueEmail('ana');
    await registerViaUI(page, { email, name: 'Ana Costa' });

    await expect(page).toHaveURL(BASE_URL + '/');
    await expect(page.getByText(/Ana/)).toBeVisible();

    // Estado vazio honesto, com a próxima ação concreta
    await expect(page.getByText(/ainda não está em nenhum clube/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Criar meu clube/i })).toBeVisible();

    expect(await countRecords('users', `email = "${email}"`)).toBe(1);
  });

  test('login com senha errada explica o que houve', async ({ page }) => {
    await page.goto('/entrar');
    await abrirFolhaAuth(page, 'login');
    await page.getByTestId('email').fill('ninguem@teste.local');
    await page.getByTestId('password').fill('senhaerrada123');
    await page.getByTestId('submit').click();

    // Mensagem visível — não um erro engolido no console
    await expect(page.getByText(/Failed to authenticate|autentic|inválid|incorret/i).first())
      .toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/entrar/);
  });
});
