import type { MemberRanking, Wine, BordaResult, Payment, ExpenseSplit, Member } from '../types';

export function calculateBordaCount(
  wines: Wine[],
  rankings: MemberRanking[]
): BordaResult[] {
  const n = wines.length;
  const pointsMap = new Map<string, number>();

  wines.forEach(w => pointsMap.set(w.id, 0));

  rankings.forEach(ranking => {
    ranking.wineOrder.forEach((wineId, index) => {
      const points = n - index; // 1st place = N points
      pointsMap.set(wineId, (pointsMap.get(wineId) || 0) + points);
    });
  });

  const results: BordaResult[] = wines.map(wine => ({
    wineId: wine.id,
    wine,
    totalPoints: pointsMap.get(wine.id) || 0,
    rank: 0,
  }));

  results.sort((a, b) => b.totalPoints - a.totalPoints);
  results.forEach((r, i) => { r.rank = i + 1; });

  return results;
}

export function calculateExpenseSplits(
  members: Member[],
  totalCost: number,
  payments: Payment[]
): ExpenseSplit[] {
  const share = totalCost / members.length;
  
  // Calculate net balance for each member (positive = owed money, negative = owes money)
  const balances = new Map<string, number>();
  members.forEach(m => balances.set(m.id, -share)); // everyone owes their share
  
  payments.forEach(p => {
    balances.set(p.memberId, (balances.get(p.memberId) || 0) + p.amount);
  });

  // Separate into creditors and debtors
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  balances.forEach((balance, id) => {
    if (balance > 0.01) creditors.push({ id, amount: balance });
    else if (balance < -0.01) debtors.push({ id, amount: -balance });
  });

  // Greedy minimum transfers
  const splits: ExpenseSplit[] = [];
  let ci = 0, di = 0;

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount);
    if (transfer > 0.01) {
      splits.push({
        fromMemberId: debtors[di].id,
        toMemberId: creditors[ci].id,
        amount: Math.round(transfer * 100) / 100,
      });
    }
    creditors[ci].amount -= transfer;
    debtors[di].amount -= transfer;
    if (creditors[ci].amount < 0.01) ci++;
    if (debtors[di].amount < 0.01) di++;
  }

  return splits;
}
