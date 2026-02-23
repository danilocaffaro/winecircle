import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getEvent, getClub, saveEvent } from '../services/storage';
import { calculateExpenseSplits } from '../utils/algorithms';
import type { Payment } from '../types';

export const ExpensePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const event = id ? getEvent(id) : undefined;
  const club = event ? getClub(event.clubId) : undefined;

  const members = club?.members.filter(m => event?.memberIds.includes(m.id)) || [];

  const [totalCost, setTotalCost] = useState(event?.expenses?.totalCost || 0);
  const [payments, setPayments] = useState<Payment[]>(
    event?.expenses?.payments || members.map(m => ({ memberId: m.id, amount: 0 }))
  );
  const [calculated, setCalculated] = useState(Boolean(event?.expenses?.splits?.length));

  if (!event || !club) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-3">😕</span>
        <p className="text-charcoal-light">Event not found</p>
      </div>
    );
  }

  const updatePayment = (memberId: string, amount: number) => {
    setPayments(prev =>
      prev.map(p => p.memberId === memberId ? { ...p, amount } : p)
    );
    setCalculated(false);
  };

  const splits = calculated ? calculateExpenseSplits(members, totalCost, payments) : [];

  const handleCalculate = () => {
    if (totalCost <= 0) {
      toast.error('Enter the total cost');
      return;
    }
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(totalPaid - totalCost) > 0.01) {
      toast.error(`Payments (R$${totalPaid.toFixed(2)}) don't match total (R$${totalCost.toFixed(2)})`);
      return;
    }
    setCalculated(true);

    const expSplits = calculateExpenseSplits(members, totalCost, payments);
    const updated = {
      ...event,
      expenses: { totalCost, payments, splits: expSplits },
    };
    saveEvent(updated);
    toast.success('Expenses calculated!');
  };

  const getMemberName = (memberId: string) =>
    members.find(m => m.id === memberId)?.name || 'Unknown';

  const sharePerPerson = members.length > 0 ? totalCost / members.length : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <Link to={`/events/${event.id}`} className="text-sm text-gold-dark hover:text-gold font-medium mb-2 inline-flex items-center gap-1 transition-colors min-h-[44px]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to event
        </Link>
        <h1 className="text-2xl font-bold text-burgundy mt-1" style={{ fontFamily: 'Playfair Display, serif' }}>
          💰 Expenses
        </h1>
        <p className="text-sm text-charcoal-light mt-0.5">{event.name}</p>
      </div>

      {/* Total Cost — 48px input */}
      <div className="bg-white rounded-xl p-5 shadow-md border border-cream-dark">
        <label className="block text-sm font-semibold text-charcoal mb-2">Total Cost (R$)</label>
        <input
          type="number"
          value={totalCost || ''}
          onChange={e => { setTotalCost(Number(e.target.value)); setCalculated(false); }}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-white text-2xl font-bold text-burgundy text-center focus:ring-2 focus:ring-burgundy/40 focus:border-burgundy transition-shadow"
          style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', minHeight: '56px' }}
        />
        {totalCost > 0 && members.length > 0 && (
          <p className="text-center text-sm text-charcoal-light mt-2">
            R${sharePerPerson.toFixed(2)} per person ({members.length} members)
          </p>
        )}
      </div>

      {/* Who Paid — 48px inputs */}
      <div className="bg-white rounded-xl p-5 shadow-md border border-cream-dark">
        <h2 className="font-semibold text-burgundy mb-4 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
          Who Paid?
        </h2>
        <div className="space-y-3">
          {members.map(member => {
            const payment = payments.find(p => p.memberId === member.id);
            return (
              <div key={member.id} className="flex items-center gap-3">
                <span className="text-sm font-medium flex-1 min-w-0 truncate text-charcoal">{member.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-charcoal-light font-medium">R$</span>
                  <input
                    type="number"
                    value={payment?.amount || ''}
                    onChange={e => updatePayment(member.id, Number(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-28 px-3 py-3 rounded-xl border border-cream-dark bg-white text-right text-charcoal font-medium focus:ring-2 focus:ring-burgundy/40 focus:border-burgundy transition-shadow"
                    style={{ fontSize: '16px', minHeight: '48px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-cream-dark flex justify-between text-sm">
          <span className="text-charcoal-light font-medium">Total paid:</span>
          <span className={`font-bold ${
            Math.abs(payments.reduce((s, p) => s + p.amount, 0) - totalCost) < 0.01
              ? 'text-green-700' : 'text-red-600'
          }`}>
            R${payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Calculate Button — 48px */}
      <button
        onClick={handleCalculate}
        className="w-full bg-burgundy text-cream py-3.5 rounded-xl font-semibold text-base hover:bg-burgundy-light active:bg-burgundy-dark transition-colors shadow-md min-h-[48px]"
      >
        Calculate Splits
      </button>

      {/* Results */}
      {calculated && splits.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-md border border-cream-dark">
          <h2 className="font-semibold text-burgundy mb-4 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            💸 Transfers
          </h2>
          <div className="space-y-3">
            {splits.map((split, i) => (
              <div key={i} className="flex items-center gap-2 bg-cream rounded-xl p-4">
                <span className="text-sm font-semibold text-burgundy">{getMemberName(split.fromMemberId)}</span>
                <svg className="w-4 h-4 text-charcoal-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <span className="text-sm font-semibold text-burgundy">{getMemberName(split.toMemberId)}</span>
                <span className="ml-auto text-sm font-bold text-gold-dark">R${split.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {calculated && splits.length === 0 && (
        <div className="text-center py-6 bg-white rounded-xl shadow-md border border-cream-dark">
          <span className="text-3xl block mb-2">✅</span>
          <p className="text-sm text-charcoal-light font-medium">Everyone is even! No transfers needed.</p>
        </div>
      )}
    </div>
  );
};
