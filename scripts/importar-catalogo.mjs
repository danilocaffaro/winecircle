#!/usr/bin/env node
/**
 * Monta o catálogo local de vinhos a partir de duas fontes abertas e carrega
 * direto no SQLite do PocketBase.
 *
 * Por que direto no SQLite: são ~245 mil linhas. Pela API REST, uma por vez,
 * levaria horas. A collection e os índices vêm da migration
 * 1786794207_wine_catalog.js — este script só preenche.
 *
 * Usa `node:sqlite` com statement preparado em vez de gerar um arquivo .sql.
 * A primeira versão montava 154 MB de INSERTs em texto e perdia 60% das linhas
 * em silêncio: as notas de degustação contêm aspas e quebras de linha, e o
 * parser do CLI do sqlite3 se perdia sem nunca reportar erro — nem com -bail.
 * Parâmetros vinculados não têm essa classe de problema.
 *
 * Fontes:
 *   we — spawn99/wine-reviews (Wine Enthusiast via Kaggle, attr. Zackthoutt)
 *        CC BY-NC-SA 4.0 · campos ricos: uva, vinícola, região, pontuação
 *        NÃO COMERCIAL: se o Wine Circle virar produto pago, esta parte sai.
 *   rt — cipher982/wine-text-126k (© 2025 David Rose)
 *        CC BY 4.0 · licença permissiva, alcança safras até 2019
 *
 * As duas param antes de 2020. O catálogo se mantém vivo por outro caminho:
 * o que o grupo resolve em tempo real é gravado de volta com source='ai'.
 *
 * O PocketBase precisa estar PARADO: ele mantém o SQLite aberto e a carga
 * falha com "database is locked".
 *
 * Uso:
 *   node scripts/importar-catalogo.mjs <catalogo.jsonl> <pb_data/data.db>
 */

import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';

const [, , jsonlPath, dbPath] = process.argv;

if (!jsonlPath || !dbPath) {
  console.error('uso: node scripts/importar-catalogo.mjs <catalogo.jsonl> <data.db>');
  process.exit(1);
}
for (const [label, p] of [['catálogo', jsonlPath], ['banco', dbPath]]) {
  if (!existsSync(p)) { console.error(`não encontrei o ${label}: ${p}`); process.exit(1); }
}

/** id no formato do PocketBase: 15 caracteres [a-z0-9], único por construção. */
const pbId = (n) => 'wcat' + n.toString(36).padStart(11, '0');

/** Minúsculo e sem acento, para "chateau" achar "Château". */
const normalize = (s) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

// O PocketBase declara toda coluna como NOT NULL DEFAULT '' — passar null
// derruba a linha. A convenção dele para "sem valor" é string vazia e zero,
// e é assim que o app lê de volta. Foi isto que descartou a fonte inteira que
// não traz uva nem vinícola: 146 mil linhas rejeitadas caladas.
const txt = (v) => (v === null || v === undefined ? '' : String(v));
const num = (v) => (Number.isFinite(v) ? v : 0);

const db = new DatabaseSync(dbPath);

try {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('DELETE FROM wc_wine_catalog');

  const insert = db.prepare(`
    INSERT INTO wc_wine_catalog
      (id, name, search, winery, grape, country, region, year, points, price,
       notes, type, source, created, updated)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const stamp = new Date().toISOString().replace('T', ' ');
  const rl = createInterface({ input: createReadStream(jsonlPath), crlfDelay: Infinity });

  let n = 0, ignorados = 0;
  db.exec('BEGIN TRANSACTION');

  for await (const line of rl) {
    if (!line.trim()) continue;
    const w = JSON.parse(line);
    const name = String(w.name || '').trim().slice(0, 300);
    if (!name) { ignorados++; continue; }

    try {
      insert.run(
        pbId(n), name, normalize(name).slice(0, 300),
        txt(w.winery), txt(w.grape), txt(w.country),
        txt(w.region || w.province),
        num(w.year), num(w.points), num(w.price),
        txt(w.notes).slice(0, 800),
        txt(w.type), txt(w.src), stamp, stamp,
      );
      n++;
      if (n % 50000 === 0) console.log(`  ...${n.toLocaleString('pt-BR')}`);
    } catch (err) {
      if (ignorados === 0) console.warn(`  primeiro descarte: ${err.message || err}`);
      ignorados++;
    }
  }

  db.exec('COMMIT');

  const [{ total }] = db.prepare('SELECT count(*) AS total FROM wc_wine_catalog').all();
  console.log(`✅ ${Number(total).toLocaleString('pt-BR')} vinhos no catálogo` +
              (ignorados ? ` (${ignorados.toLocaleString('pt-BR')} ignorados)` : ''));
} catch (err) {
  try { db.exec('ROLLBACK'); } catch { /* nada aberto */ }
  if (String(err).includes('locked')) {
    console.error('\n❌ o banco está em uso. Pare o PocketBase e rode de novo.');
  } else {
    console.error(`\n❌ ${err.message || err}`);
  }
  process.exitCode = 1;
} finally {
  db.close();
}
