import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { calculateExpenseSplits } from '../utils/algorithms';
import { useAuth } from '../contexts/AuthContext';
import {
  getEvent as getEventPB, getClub as getClubPB,
  createExpense, createPayments,
  markAsPaid, confirmPayment, disputePayment,
  pb, getCurrentUser, getUsers, userToMember,
} from '../services/pocketbase';
import type { Payment, ExpenseSplit, Member } from '../types';

type PaymentStatus = 'pending' | 'paid' | 'confirmed' | 'disputed';

interface PaymentRecord {
  id: string;
  debtor: string;
  creditor: string;
  amount: number;
  status: PaymentStatus;
  pix_key?: string;
  paid_at?: string;
  confirmed_at?: string;
  expand?: { debtor?: any; creditor?: any };
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   icon: 'schedule',       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  paid:      { label: 'Paid',      icon: 'check',          color: '#32BCAD', bg: 'rgba(50,188,173,0.12)' },
  confirmed: { label: 'Confirmed', icon: 'check_circle',   color: '#2E7D32', bg: 'rgba(46,125,50,0.12)' },
  disputed:  { label: 'Disputed',  icon: 'error_outline',  color: 'var(--md-error)', bg: 'rgba(186,26,26,0.12)' },
};

export const ExpensePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { authenticated } = useAuth();
  const currentUser = getCurrentUser();

  const [event, setEvent] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalCost, setTotalCost] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Load event + club + members from PB
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const evt = await getEventPB(id);
        setEvent(evt);
        const c = await getClubPB(evt.club);
        setClub(c);
        const participantIds: string[] = evt.participants || [];
        if (participantIds.length > 0) {
          const users = await getUsers(participantIds);
          const m = users.map(userToMember);
          setMembers(m);
          setPayments(m.map(member => ({ memberId: member.id, amount: 0 })));
        }
      } catch (e) {
        console.error('Failed to load expense data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Load payment records from PocketBase when authenticated
  const loadPaymentRecords = useCallback(async () => {
    if (!authenticated || !id) return;
    try {
      const records = await pb.collection('wc_payments').getFullList({
        filter: `expense.event = "${id}"`,
        expand: 'debtor,creditor',
        sort: '-created',
      });
      setPaymentRecords(records as unknown as PaymentRecord[]);
    } catch {
      // Silently fail — may not have PB expense records yet
    }
  }, [authenticated, id]);

  useEffect(() => { loadPaymentRecords(); }, [loadPaymentRecords]);

  // Realtime subscription for payment updates
  useEffect(() => {
    if (!authenticated) return;
    pb.collection('wc_payments').subscribe('*', () => {
      loadPaymentRecords();
    });
    return () => { pb.collection('wc_payments').unsubscribe(); };
  }, [authenticated, loadPaymentRecords]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin" style={{ color: 'var(--dp-gold)' }} />
      </div>
    );
  }

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

  const handleCalculate = async () => {
    if (totalCost <= 0) { toast.error('Enter the total cost'); return; }
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(totalPaid - totalCost) > 0.01) {
      toast.error(`Payments (R$${totalPaid.toFixed(2)}) don't match total (R$${totalCost.toFixed(2)})`);
      return;
    }
    setCalculated(true);
    const expSplits = calculateExpenseSplits(members, totalCost, payments);
    toast.success('Expenses calculated!');

    // Sync to PocketBase
    setSyncing(true);
    try {
      const expense = await createExpense({
          event: id!,
          total_amount: totalCost,
          split_type: 'equal',
          splits: expSplits,
        });

        // Create payment records for each transfer
        const paymentData = expSplits.map(s => {
          const toMember = members.find(m => m.id === s.toMemberId);
          return {
            debtor: s.fromMemberId,
            creditor: s.toMemberId,
            amount: s.amount,
            pix_key: toMember?.pixKey,
          };
        });

        if (paymentData.length > 0) {
          await createPayments(expense.id, paymentData);
          await loadPaymentRecords();
          toast.success('Payment tracking synced!');
        }
      } catch (err) {
        console.error('PB sync failed:', err);
        toast.error('Failed to save expenses');
      } finally {
        setSyncing(false);
      }
  };

  const handleMarkPaid = async (paymentId: string) => {
    try {
      await markAsPaid(paymentId);
      await loadPaymentRecords();
      toast.success('Marked as paid!');
    } catch { toast.error('Failed to update'); }
  };

  const handleConfirm = async (paymentId: string) => {
    try {
      await confirmPayment(paymentId);
      await loadPaymentRecords();
      toast.success('Payment confirmed!');
    } catch { toast.error('Failed to confirm'); }
  };

  const handleDispute = async (paymentId: string) => {
    try {
      await disputePayment(paymentId);
      await loadPaymentRecords();
      toast('Payment disputed', { icon: '⚠️' });
    } catch { toast.error('Failed to dispute'); }
  };

  const getMemberName = (memberId: string) => members.find(m => m.id === memberId)?.name || 'Unknown';
  const sharePerPerson = members.length > 0 ? totalCost / members.length : 0;

  // Get PB payment record for a split (match by debtor+creditor+amount)
  const getPaymentRecord = (split: ExpenseSplit): PaymentRecord | undefined => {
    return paymentRecords.find(pr =>
      pr.debtor === split.fromMemberId &&
      pr.creditor === split.toMemberId &&
      Math.abs(pr.amount - split.amount) < 0.01
    );
  };

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
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{event.title || event.name}</p>
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

      <button onClick={handleCalculate} disabled={syncing} className="btn-primary w-full" style={{ height: 48, borderRadius: 'var(--shape-large)' }}>
        {syncing ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />
            Syncing...
          </span>
        ) : (
          <>
            <span className="material-symbols-rounded" style={{ fontSize: 20 }}>calculate</span>
            Calculate Splits
          </>
        )}
      </button>

      {/* Transfers with Payment Status */}
      {calculated && splits.length > 0 && (
        <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>swap_horiz</span>
            <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>Transfers</h2>
          </div>
          <div className="space-y-3">
            {splits.map((split, i) => {
              const toMember = members.find(m => m.id === split.toMemberId);
              const pr = getPaymentRecord(split);
              const status = pr?.status || 'pending';
              const statusCfg = STATUS_CONFIG[status];
              const isDebtor = currentUser?.id === split.fromMemberId;
              const isCreditor = currentUser?.id === split.toMemberId;

              return (
                <div key={i} className="p-4" style={{ background: 'var(--md-surface-container)', borderRadius: 'var(--shape-large)' }}>
                  {/* Transfer info */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="type-label-large" style={{ color: 'var(--md-on-surface)' }}>{getMemberName(split.fromMemberId)}</span>
                    <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--md-outline)' }}>arrow_forward</span>
                    <span className="type-label-large" style={{ color: 'var(--md-on-surface)' }}>{getMemberName(split.toMemberId)}</span>
                    <span className="ml-auto type-title-small font-bold" style={{ color: 'var(--md-tertiary)' }}>R${split.amount.toFixed(2)}</span>
                  </div>

                  {/* Status badge */}
                  {pr && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 'var(--shape-full)',
                      background: statusCfg.bg, marginBottom: 8,
                    }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14, color: statusCfg.color }}>{statusCfg.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: statusCfg.color }}>{statusCfg.label}</span>
                      {pr.paid_at && status === 'paid' && (
                        <span style={{ fontSize: 11, color: 'var(--md-on-surface-variant)', marginLeft: 4 }}>
                          {new Date(pr.paid_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pix key */}
                  {toMember?.pixKey && (
                    <div className="flex items-center gap-2 py-2" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                      <span className="pix-badge">PIX</span>
                      <span className="type-body-small flex-1 truncate" style={{ color: 'var(--md-on-surface-variant)' }}>{toMember.pixKey}</span>
                      <button onClick={() => { navigator.clipboard.writeText(toMember.pixKey!); toast.success('Chave Pix copiada!'); }}
                        style={{ background: '#32BCAD', color: 'white', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 'var(--shape-medium)', border: 'none', cursor: 'pointer', minHeight: 32 }}>
                        Copiar
                      </button>
                    </div>
                  )}

                  {/* Action buttons (only for authenticated users) */}
                  {authenticated && pr && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      {/* Debtor can mark as paid */}
                      {isDebtor && status === 'pending' && (
                        <button onClick={() => handleMarkPaid(pr.id)} style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: 'var(--shape-large)',
                          background: '#32BCAD', color: 'white', border: 'none',
                          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check</span>
                          I've Paid
                        </button>
                      )}

                      {/* Creditor can confirm or dispute */}
                      {isCreditor && status === 'paid' && (
                        <>
                          <button onClick={() => handleConfirm(pr.id)} style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '10px 16px', borderRadius: 'var(--shape-large)',
                            background: '#2E7D32', color: 'white', border: 'none',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>check_circle</span>
                            Confirm Received
                          </button>
                          <button onClick={() => handleDispute(pr.id)} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            padding: '10px 16px', borderRadius: 'var(--shape-large)',
                            background: 'rgba(186,26,26,0.08)', color: 'var(--md-error)', border: '1px solid var(--md-error)',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            <span className="material-symbols-rounded" style={{ fontSize: 18 }}>error_outline</span>
                            Dispute
                          </button>
                        </>
                      )}

                      {/* Waiting states */}
                      {isDebtor && status === 'paid' && (
                        <div style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: 'var(--shape-large)',
                          background: 'rgba(50,188,173,0.08)', color: '#32BCAD',
                          fontSize: 13, fontWeight: 500,
                        }}>
                          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>schedule</span>
                          Waiting confirmation...
                        </div>
                      )}

                      {status === 'confirmed' && (
                        <div style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: 'var(--shape-large)',
                          background: 'rgba(46,125,50,0.08)', color: '#2E7D32',
                          fontSize: 13, fontWeight: 500,
                        }}>
                          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 18 }}>check_circle</span>
                          All settled! ✓
                        </div>
                      )}
                    </div>
                  )}

                  {/* Not authenticated hint */}
                  {!authenticated && !pr && (
                    <p style={{ fontSize: 12, color: 'var(--md-on-surface-variant)', fontStyle: 'italic', marginTop: 8 }}>
                      Sign in to track payment status
                    </p>
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
