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
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>error_outline</span>
        <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>Event not found</p>
      </div>
    );
  }

  const updatePayment = (memberId: string, amount: number) => {
    setPayments(prev => prev.map(p => p.memberId === memberId ? { ...p, amount } : p));
    setCalculated(false);
  };

  const splits = calculated ? calculateExpenseSplits(members, totalCost, payments) : [];

  const handleCalculate = () => {
    if (totalCost <= 0) { toast.error('Enter the total cost'); return; }
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(totalPaid - totalCost) > 0.01) {
      toast.error(`Payments (R$${totalPaid.toFixed(2)}) don't match total (R$${totalCost.toFixed(2)})`);
      return;
    }
    setCalculated(true);
    const expSplits = calculateExpenseSplits(members, totalCost, payments);
    saveEvent({ ...event, expenses: { totalCost, payments, splits: expSplits } });
    toast.success('Expenses calculated!');
  };

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || 'Unknown';
  const sharePerPerson = members.length > 0 ? totalCost / members.length : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to={`/events/${event.id}`} className="btn-text inline-flex items-center" style={{ paddingLeft: 0, marginBottom: 16 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        Back to event
      </Link>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)' }}>payments</span>
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>Expenses</h1>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{event.name}</p>
      </div>

      {/* Total Cost */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)', marginBottom: 20 }}>
        <label className="type-label-large block mb-2" style={{ color: 'var(--md-on-surface)' }}>Total Cost (R$)</label>
        <input type="number" value={totalCost || ''} onChange={e => { setTotalCost(Number(e.target.value)); setCalculated(false); }}
          placeholder="0.00" step="0.01" min="0" className="input-outlined w-full text-center"
          style={{ fontSize: 24, fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--md-primary)', minHeight: 56, borderRadius: 'var(--shape-large)' }} />
        {totalCost > 0 && members.length > 0 && (
          <p className="type-body-small text-center mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>
            R${sharePerPerson.toFixed(2)} per person ({members.length} members)
          </p>
        )}
      </div>

      {/* Who Paid */}
      <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
        <h2 className="type-title-medium mb-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>Who Paid?</h2>
        <div className="space-y-3">
          {members.map(member => {
            const payment = payments.find(p => p.memberId === member.id);
            return (
              <div key={member.id} className="flex items-center gap-3">
                <span className="type-body-medium flex-1 min-w-0 truncate" style={{ color: 'var(--md-on-surface)' }}>{member.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="type-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>R$</span>
                  <input type="number" value={payment?.amount || ''} onChange={e => updatePayment(member.id, Number(e.target.value))}
                    placeholder="0.00" step="0.01" min="0" className="input-outlined w-28 text-right"
                    style={{ minHeight: 48, borderRadius: 'var(--shape-medium)' }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 flex justify-between type-body-medium" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
          <span style={{ color: 'var(--md-on-surface-variant)' }}>Total paid:</span>
          <span style={{ fontWeight: 700, color: Math.abs(payments.reduce((s, p) => s + p.amount, 0) - totalCost) < 0.01 ? '#2E7D32' : 'var(--md-error)' }}>
            R${payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>

      <button onClick={handleCalculate} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>calculate</span>
        Calculate Splits
      </button>

      {/* Transfers */}
      {calculated && splits.length > 0 && (
        <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>swap_horiz</span>
            <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>Transfers</h2>
          </div>
          <div className="space-y-3">
            {splits.map((split, i) => {
              const toMember = members.find(m => m.id === split.toMemberId);
              return (
                <div key={i} className="p-4 space-y-2" style={{ background: 'var(--md-surface-container)', borderRadius: 'var(--shape-large)' }}>
                  <div className="flex items-center gap-2">
                    <span className="type-label-large" style={{ color: 'var(--md-on-surface)' }}>{getMemberName(split.fromMemberId)}</span>
                    <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-outline)' }}>arrow_forward</span>
                    <span className="type-label-large" style={{ color: 'var(--md-on-surface)' }}>{getMemberName(split.toMemberId)}</span>
                    <span className="ml-auto type-title-small font-bold" style={{ color: 'var(--md-tertiary)' }}>R${split.amount.toFixed(2)}</span>
                  </div>
                  {toMember?.pixKey && (
                    <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                      <span className="pix-badge">PIX</span>
                      <span className="type-body-small flex-1 truncate" style={{ color: 'var(--md-on-surface-variant)' }}>{toMember.pixKey}</span>
                      <button onClick={() => { navigator.clipboard.writeText(toMember.pixKey!); toast.success('Chave Pix copiada!'); }}
                        style={{ background: '#32BCAD', color: 'white', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--shape-medium)', border: 'none', cursor: 'pointer', minHeight: 32 }}>
                        Copiar Pix
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {calculated && splits.length === 0 && (
        <div className="card-elevated text-center py-8" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 40, color: '#2E7D32' }}>check_circle</span>
          <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>Everyone is even! No transfers needed.</p>
        </div>
      )}
    </div>
  );
};
