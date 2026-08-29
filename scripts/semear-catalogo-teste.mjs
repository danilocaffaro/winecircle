#!/usr/bin/env node
/**
 * Semeia o catálogo de vinhos da instância de teste.
 *
 * Por que existe: o catálogo de produção tem ~245 mil linhas e entra pelo
 * `importar-catalogo.mjs`, direto no SQLite, com o PocketBase parado. Isso é
 * inviável no CI — e sem catálogo, o autocomplete não devolve nada. O efeito
 * era pior do que "alguns testes pulam": o cenário 2 falhava ao esperar uma
 * sugestão que nunca vinha, o Playwright reiniciava o worker, o `beforeAll`
 * rodava `resetDatabase()` de novo e o teste seguinte perdia o `clubId` — o
 * que aparecia como falha no teste de permissão de exclusão do clube, onde
 * não havia falha nenhuma.
 *
 * Aqui são 50 vinhos, pela API REST, o que leva menos de um segundo. Só dados
 * factuais (produtor, região, uva, safra): as notas de degustação dos datasets
 * abertos são a parte com licença restritiva e não entram no repositório.
 *
 * O `search` é derivado do nome aqui, com a mesma normalização dos hooks — se
 * as duas divergirem, a busca para de achar acento, que é justamente o que ela
 * existe para resolver.
 *
 * É idempotente: `name` tem índice único, então rodar de novo não duplica.
 *
 * Uso:
 *   node scripts/semear-catalogo-teste.mjs
 *
 * Variáveis: WC_TEST_PB_URL, WC_TEST_PB_ADMIN, WC_TEST_PB_PASSWORD
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(AQUI, '..', 'test', 'fixtures', 'catalogo-teste.jsonl');

const PB_URL = process.env.WC_TEST_PB_URL || 'http://127.0.0.1:8091';
const ADMIN = process.env.WC_TEST_PB_ADMIN || 'test@local.dev';
const ADMIN_PASS = process.env.WC_TEST_PB_PASSWORD || 'TesteLocal2026!';

// Mesmo guard dos testes: isto cria registros, e produção não é lugar para isso.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(PB_URL)) {
  console.error(`RECUSANDO RODAR: WC_TEST_PB_URL aponta para "${PB_URL}", que não é local.`);
  process.exit(1);
}

/** Igual à normalização de pb_hooks/wine_search.pb.js. */
const normalizar = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function main() {
  if (!existsSync(FIXTURE)) {
    console.error(`não encontrei o fixture: ${FIXTURE}`);
    process.exit(1);
  }

  const vinhos = readFileSync(FIXTURE, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  const auth = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN, password: ADMIN_PASS }),
  });
  if (!auth.ok) {
    console.error(`falha ao autenticar como superusuário: ${auth.status} ${await auth.text()}`);
    process.exit(1);
  }
  const { token } = await auth.json();

  let criados = 0;
  let existentes = 0;
  for (const v of vinhos) {
    const res = await fetch(`${PB_URL}/api/collections/wc_wine_catalog/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        name: v.name,
        search: normalizar(v.name),
        winery: v.winery || '',
        grape: v.grape || '',
        country: v.country || '',
        region: v.region || '',
        year: v.year || 0,
        points: v.points || 0,
        price: v.price || 0,
        notes: '',
        type: v.type || '',
        source: 'we',
      }),
    });

    if (res.ok) { criados++; continue; }
    // 400 com índice único violado = já estava lá, que é o caso de rodar duas vezes
    if (res.status === 400) { existentes++; continue; }
    console.error(`falha ao gravar "${v.name}": ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const caps = await fetch(`${PB_URL}/api/wc/capabilities`).then((r) => r.json()).catch(() => null);
  console.log(
    `catálogo de teste: ${criados} criados, ${existentes} já existiam` +
    (caps ? ` — total na instância: ${caps.catalog}` : ''),
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
