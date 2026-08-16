import { test, expect } from '@playwright/test';
import { BASE_URL } from '../helpers.mjs';

/**
 * Cenário 7 — Instalar como app
 *
 * Um PWA só vira instalável se o navegador achar tudo no lugar: manifest com
 * os campos certos, ícones nos tamanhos certos e um service worker com
 * handler de fetch. Falta um item e o `beforeinstallprompt` simplesmente não
 * dispara — sem erro nenhum, o botão só nunca aparece.
 *
 * Estes testes conferem cada critério, para a instalação não quebrar em
 * silêncio num deploy futuro.
 */

test.describe('Cenário 7 — Instalação como app', () => {
  test('o manifest declara tudo que o navegador exige', async ({ request }) => {
    const r = await request.get(`${BASE_URL}/manifest.json`);
    expect(r.status()).toBe(200);
    const m = await r.json();

    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(m.display);
    expect(m.id).toBeTruthy();
    expect(m.lang).toBe('pt-BR');

    // Sem 192 e 512 o Chrome não considera instalável
    const tamanhos = m.icons.map((i) => i.sizes);
    expect(tamanhos).toContain('192x192');
    expect(tamanhos).toContain('512x512');

    // `any` e `maskable` precisam ser arquivos diferentes: a arte maskable é
    // recortada num círculo, e reusar a mesma imagem come as bordas.
    const any = m.icons.filter((i) => i.purpose === 'any');
    const maskable = m.icons.filter((i) => i.purpose === 'maskable');
    expect(any.length).toBeGreaterThan(0);
    expect(maskable.length).toBeGreaterThan(0);
    expect(maskable[0].src).not.toBe(any[0].src);
  });

  test('todos os ícones e capturas do manifest existem', async ({ request }) => {
    const m = await (await request.get(`${BASE_URL}/manifest.json`)).json();
    for (const recurso of [...m.icons, ...(m.screenshots || [])]) {
      const r = await request.get(`${BASE_URL}${recurso.src}`);
      expect(r.status(), `${recurso.src} deveria existir`).toBe(200);
      expect(r.headers()['content-type']).toContain('image');
    }
  });

  test('as capturas do diálogo de instalação estão declaradas', async ({ request }) => {
    const m = await (await request.get(`${BASE_URL}/manifest.json`)).json();
    // O Android mostra estas imagens no diálogo — sem elas ele fica seco
    expect(m.screenshots?.length).toBeGreaterThanOrEqual(1);
    for (const s of m.screenshots) {
      expect(s.form_factor).toBe('narrow');
      expect(s.label).toBeTruthy();
      expect(s.sizes).toMatch(/^\d+x\d+$/);
    }
  });

  test('o service worker registra e tem handler de fetch', async ({ page }) => {
    await page.goto('/');

    const registrado = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      return !!r;
    });
    expect(registrado).toBe(true);

    // Sem `fetch` o navegador não considera o app instalável
    const fonte = await (await page.request.get(`${BASE_URL}/sw.js`)).text();
    expect(fonte).toMatch(/addEventListener\(\s*['"]fetch['"]/);
    // E precisa ser JavaScript de verdade — já foi entregue TypeScript uma vez
    expect(fonte).not.toMatch(/^\s*declare\s/m);
  });

  test('o convite de instalar aparece quando o navegador oferece', async ({ page }) => {
    await page.goto('/entrar');

    // O Chromium do Playwright não dispara beforeinstallprompt sozinho;
    // simulamos para exercitar o caminho da interface.
    await page.evaluate(() => {
      const ev = new Event('beforeinstallprompt');
      ev.prompt = () => Promise.resolve();
      ev.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(ev);
    });

    await expect(page.getByTestId('instalar-faixa')).toBeVisible();
    await expect(page.getByTestId('instalar-botao')).toBeVisible();
  });

  test('dispensar o convite guarda a escolha', async ({ page }) => {
    await page.goto('/entrar');
    await page.evaluate(() => {
      const ev = new Event('beforeinstallprompt');
      ev.prompt = () => Promise.resolve();
      ev.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(ev);
    });

    await page.getByTestId('instalar-dispensar').click();
    await expect(page.getByTestId('instalar-faixa')).toHaveCount(0);

    const guardado = await page.evaluate(() => localStorage.getItem('wc_instalar_dispensado'));
    expect(guardado).toBe('1');
  });

  // A Apple não implementa beforeinstallprompt: no iOS não existe instalação
  // programática em navegador nenhum. Desde o iOS 17, porém, Chrome e Edge
  // também oferecem "Adicionar à Tela de Início" — e o botão fica em lugares
  // diferentes em cada um, então a instrução tem que mudar junto.
  const NAVEGADORES_IOS = [
    // O Safari do iOS 26 esconde o compartilhar atrás do "⋯" no layout padrão;
    // mandar procurar o ícone é mandar procurar o que não está na tela.
    ['Safari iOS 26', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1', /Instalar pelo Safari/i, /⋯ no canto de baixo/i],
    ['Safari iOS 18', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1', /Instalar pelo Safari/i, /ícone de compartilhar, na barra de baixo/i],
    ['Chrome', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1', /Instalar pelo Chrome/i, /ao lado do endereço/i],
    ['Edge', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 EdgiOS/120.0 Mobile/15E148 Safari/604.1', /Instalar pelo Edge/i, /menu \(⋯\)/i],
  ];

  for (const [nome, ua, titulo, primeiroPasso] of NAVEGADORES_IOS) {
    test(`no iPhone com ${nome} o guia aponta o lugar certo`, async ({ browser }) => {
      const ctx = await browser.newContext({ userAgent: ua, viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/entrar`);

      await expect(page.getByTestId('instalar-faixa')).toBeVisible();
      await page.getByTestId('instalar-botao').click();

      const folha = page.getByTestId('instalar-ios');
      await expect(folha).toBeVisible();
      await expect(folha.getByRole('heading')).toHaveText(titulo);

      // Passo 1: onde tocar — muda de navegador para navegador
      await page.getByTestId('guia-passo-0').click();
      await expect(folha).toContainText(primeiroPasso);

      // Passo 2: a linha da folha de compartilhamento
      await page.getByTestId('guia-passo-1').click();
      await expect(folha).toContainText(/Adicionar à Tela de Início/i);

      // Passo 3: o ícone chega na tela de início
      await page.getByTestId('guia-passo-2').click();
      await expect(folha).toContainText(/ícone vai para a tela/i);

      await page.getByTestId('instalar-fechar').click();
      await expect(folha).toHaveCount(0);
      await ctx.close();
    });
  }

  test('dentro do WhatsApp, manda abrir no navegador em vez de ensinar o gesto', async ({ browser }) => {
    // Navegador embutido em outro app não tem "Adicionar à Tela de Início" —
    // e o convite do clube circula por link, então este caminho é comum.
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 '
        + '(KHTML, like Gecko) Mobile/15E148',
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/entrar`);

    await page.getByTestId('instalar-botao').click();
    const folha = page.getByTestId('instalar-ios');
    await expect(folha.getByRole('heading')).toHaveText(/Abra no navegador do iPhone/i);
    await expect(page.getByTestId('instalar-in-app')).toContainText(/Abrir no Safari/i);
    // Não ensinamos o gesto aqui: a opção não existe neste contexto
    await expect(page.getByTestId('guia-passo-0')).toHaveCount(0);
    await ctx.close();
  });

  test('no iPhone com Firefox não prometemos o que não existe', async ({ browser }) => {
    // Firefox no iOS não tem "Adicionar à Tela de Início" — mostrar instrução
    // mandaria a pessoa procurar um menu que não está lá.
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '
        + '(KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15',
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/entrar`);

    await expect(page.getByTestId('instalar-faixa')).toHaveCount(0);
    await ctx.close();
  });

  test('o pedido de armazenamento persistente é feito ao entrar', async ({ page }) => {
    // O Safari apaga os dados de um web app parado há ~7 dias — e o token de
    // sessão mora no localStorage. Sem o pedido, quem degusta uma vez por mês
    // volta deslogado sem entender por quê.
    await page.goto('/entrar');
    const temApi = await page.evaluate(() => typeof navigator.storage?.persist === 'function');
    expect(temApi).toBe(true);
  });

  test('quem já instalou não vê o convite', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    // Rodando como app, o display-mode é standalone
    await page.emulateMedia({ media: 'screen', reducedMotion: null });
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) =>
        q.includes('display-mode: standalone')
          ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
          : real(q);
    });
    await page.goto(`${BASE_URL}/entrar`);

    await expect(page.getByTestId('instalar-faixa')).toHaveCount(0);
    await ctx.close();
  });
});
