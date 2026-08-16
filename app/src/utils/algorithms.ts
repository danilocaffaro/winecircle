import type { Wine, Rating, BordaResult, Contribution, ExpenseSplit } from '../types';

/**
 * Contagem de Borda a partir das linhas de wc_ratings.
 *
 * Cada pessoa distribui N pontos para o 1º colocado, N-1 para o 2º, e assim
 * por diante. Antes isto lia um blob JSON de rankings gravado no evento; agora
 * lê uma linha por (pessoa, vinho), o que também elimina a corrida em que duas
 * submissões simultâneas se sobrescreviam.
 *
 * Rankings parciais não distorcem o resultado: quem não classificou um vinho
 * simplesmente não dá pontos a ele.
 */
export function calculateBorda(wines: Wine[], ratings: Rating[]): BordaResult[] {
  const n = wines.length;
  const points = new Map<number, number>();
  const firsts = new Map<number, number>();

  wines.forEach((_, i) => { points.set(i, 0); firsts.set(i, 0); });

  for (const r of ratings) {
    if (r.wine_index < 0 || r.wine_index >= n) continue; // vinho removido do evento
    points.set(r.wine_index, (points.get(r.wine_index) || 0) + (n - r.rank + 1));
    if (r.rank === 1) firsts.set(r.wine_index, (firsts.get(r.wine_index) || 0) + 1);
  }

  const results: BordaResult[] = wines.map((wine, i) => ({
    wineIndex: i,
    wine,
    totalPoints: points.get(i) || 0,
    rank: 0,
    firstPlaces: firsts.get(i) || 0,
  }));

  // Desempate: mais primeiros lugares vence; depois, ordem original (estável).
  results.sort((a, b) =>
    b.totalPoints - a.totalPoints ||
    b.firstPlaces - a.firstPlaces ||
    a.wineIndex - b.wineIndex,
  );
  results.forEach((r, i) => { r.rank = i + 1; });

  return results;
}

/** Quantas pessoas já enviaram o ranking neste evento. */
export function tastersWhoSubmitted(ratings: Rating[]): Set<string> {
  return new Set(ratings.map((r) => r.user));
}

/** Pontuação máxima possível por vinho, dado quantas pessoas votaram. */
export function maxPoints(wineCount: number, tasterCount: number): number {
  return wineCount * tasterCount;
}

/**
 * Rótulo cego estável: "Vinho A" para o índice 0, "B" para o 1, e assim por
 * diante (A-16).
 *
 * A versão anterior derivava a letra da posição na lista *já reordenada* pela
 * pessoa — então o vinho A virava B assim que alguém arrastava um card, e as
 * duas telas (degustação e evento) discordavam sobre qual vinho era qual.
 * Ancorando no índice original do array `wines`, a letra nunca se move.
 */
export function blindLabel(wineIndex: number): string {
  let label = '';
  let n = wineIndex;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Vinho ${label}`;
}

/**
 * Quem paga quanto a quem, minimizando o número de transferências.
 *
 * Todo mundo deve uma cota igual; quem desembolsou mais que a cota vira
 * credor, quem desembolsou menos vira devedor. O casamento guloso entre os
 * dois lados produz um número de transferências próximo do mínimo.
 */
export function calculateTransfers(
  memberIds: string[],
  totalCost: number,
  contributions: Contribution[],
): ExpenseSplit[] {
  if (memberIds.length === 0 || totalCost <= 0) return [];

  const share = totalCost / memberIds.length;
  const balances = new Map<string, number>();
  memberIds.forEach((id) => balances.set(id, -share));

  for (const c of contributions) {
    if (!balances.has(c.memberId)) continue; // deixou de ser participante
    balances.set(c.memberId, (balances.get(c.memberId) || 0) + c.amount);
  }

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];
  balances.forEach((balance, id) => {
    if (balance > 0.01) creditors.push({ id, amount: balance });
    else if (balance < -0.01) debtors.push({ id, amount: -balance });
  });

  // Ordem determinística: mesmo input sempre gera as mesmas transferências,
  // o que mantém os pagamentos estáveis entre recálculos.
  creditors.sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  debtors.sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const transfers: ExpenseSplit[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].amount, debtors[di].amount);
    if (amount > 0.01) {
      transfers.push({
        fromMemberId: debtors[di].id,
        toMemberId: creditors[ci].id,
        amount: Math.round(amount * 100) / 100,
      });
    }
    creditors[ci].amount -= amount;
    debtors[di].amount -= amount;
    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  return transfers;
}

export const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Formata a data de um evento sem deslocar o dia.
 *
 * `new Date('2026-09-20')` é interpretado como meia-noite UTC; em qualquer
 * fuso negativo — o Brasil inteiro — isso vira 19/09 na hora de exibir. Um
 * evento marcado para sábado aparecia como sexta.
 *
 * Aceita tanto a data pura ('2026-09-20') quanto o formato do PocketBase
 * ('2026-09-20 12:00:00.000Z'), tratando a parte de data como local.
 */
export function formatEventDate(value: string): string {
  if (!value) return '';
  const [datePart] = value.split(/[ T]/);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR');
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-BR');
}
