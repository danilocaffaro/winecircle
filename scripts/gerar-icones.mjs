#!/usr/bin/env node
/**
 * Gera os ícones do PWA e as capturas que aparecem no diálogo de instalação.
 *
 * O ícone anterior era um emoji de taça com as letras "WC" embaixo — que em
 * português lê como banheiro — e usava `purpose: "any maskable"` no mesmo
 * arquivo, o que no Android recorta a arte num círculo e comia o texto.
 *
 * Aqui saem três coisas distintas:
 *   icon-{192,512}.v2.png       arte cheia, para onde o sistema não recorta
 *   icon-maskable-512.v2.png    mesma marca dentro da zona segura (80% central)
 *   apple-touch-icon.v2.png     180px, sem transparência (iOS não suporta)
 *
 * O sufixo de versão não é enfeite: os ícones ficam atrás do Cloudflare, que
 * serviu a arte antiga por horas depois do deploy. Renomear é o único jeito
 * que funciona em qualquer CDN — ao trocar a arte, suba o número aqui e no
 * manifest.json.
 *
 * Uso: node scripts/gerar-icones.mjs
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');

/**
 * A marca: uma taça em corte simples dentro de um anel — o "círculo" do nome.
 * Desenhada em traço, não em emoji, para continuar legível a 48px.
 *
 * @param {number} escala fração do lado ocupada pela arte (0.78 = zona segura)
 */
const marca = (escala) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#7D2935"/>
      <stop offset="55%" stop-color="#9C404C"/>
      <stop offset="100%" stop-color="#6B1F2A"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#fundo)"/>

  <g transform="translate(256 256) scale(${escala}) translate(-256 -256)">
    <!-- anel -->
    <circle cx="256" cy="256" r="176" fill="none" stroke="#D9AE63" stroke-width="14" opacity="0.55"/>

    <!-- taça -->
    <g stroke="#FDF3EC" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M170 150 h172 a8 8 0 0 1 8 8 v26 a94 94 0 0 1 -188 0 v-26 a8 8 0 0 1 8 -8 z"/>
      <path d="M256 278 v76"/>
      <path d="M198 362 h116"/>
    </g>
    <!-- vinho -->
    <path d="M172 208 h168 a86 86 0 0 1 -168 0 z" fill="#D9AE63"/>
  </g>
</svg>`;

async function renderizar(page, svg, tamanho, arquivo, fundo = null) {
  await page.setViewportSize({ width: tamanho, height: tamanho });
  await page.setContent(
    `<body style="margin:0;background:${fundo || 'transparent'}">` +
    `<div style="width:${tamanho}px;height:${tamanho}px">${svg.replace('width="512" height="512"', `width="${tamanho}" height="${tamanho}"`)}</div>` +
    `</body>`,
  );
  await page.screenshot({ path: join(PUBLIC, arquivo), omitBackground: !fundo });
  console.log(`  ${arquivo}  ${tamanho}×${tamanho}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

console.log('ícones:');
const V = 'v2';
await renderizar(page, marca(1), 192, `icon-192.${V}.png`);
await renderizar(page, marca(1), 512, `icon-512.${V}.png`);
// Zona segura: o Android recorta num círculo de ~80% do lado
await renderizar(page, marca(0.78), 512, `icon-maskable-512.${V}.png`);
await renderizar(page, marca(1), 180, `apple-touch-icon.${V}.png`, '#9C404C');

await browser.close();
console.log('\npronto — rode `npm run build` e publique');
