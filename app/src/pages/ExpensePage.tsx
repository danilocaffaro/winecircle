import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { calculateTransfers, formatBRL } from '../utils/algorithms';
import {
  pb, getEvent, getMembers, getEventExpense, getEventPayments, saveExpense,
  markAsPaid, confirmPayment, disputePayment, getCurrentUser, describeError,
} from '../services/pocketbase';
import type {
  TastingEvent, Member, Payment, PaymentStatus, Contribution, Expense,
} from '../types';

const STATUS: Record<PaymentStatus, { label: string; icon: string; color: string; bg: string }> = {
  pending:   { label: 'Pendente',   icon: 'schedule',      color: '#B0651A', bg: 'rgba(176,101,26,0.12)' },
  paid:      { label: 'Pago',       icon: 'check',         color: '#1F8A7C', bg: 'rgba(31,138,124,0.12)' },
  confirmed: { label: 'Confirmado', icon: 'check_circle',  color: '#2E7D32', bg: 'rgba(46,125,50,0.12)' },
  disputed:  { label: 'Contestado', icon: 'error_outline', color: 'var(--md-error)', bg: 'rgba(186,26,26,0.12)' },
};

/**
 * Divisão de contas persistente (A-07, A-08).
 *
 * A versão anterior guardava total, contribuições e o flag `calculated` só em
 * useState, e o painel de transferências só renderizava sob `calculated`. Ou
 * seja: existia apenas na sessão em que alguém digitou os valores. Quem abria
 * o link depois — justamente o devedor — via um formulário vazio e não tinha
 * como marcar "paguei". E cada clique em calcular criava despesa e pagamentos
 * novos, duplicando tudo.
 *
 * Agora a despesa é carregada do backend no mount, é uma por evento, e a
 * reconciliação preserva o status de quem já pagou.
 */
export const ExpensePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const me = getCurrentUser();

  const [event, setEvent] = useState<TastingEvent | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [totalCost, setTotalCost] = useState(0);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const evt = await getEvent(id);
    setEvent(evt);
    const ids = evt.participants || [];
    const mem = await getMembers(ids);
    setMembers(mem);

    const exp = await getEventExpense(id);
    setExpense(exp);

    if (exp) {
      setTotalCost(exp.total_amount);
      const saved = exp.splits?.contributions || [];
      // Reidrata as contribuições salvas, completando quem entrou depois.
      setContributions(ids.map((memberId) => ({
        memberId,
        amount: saved.find((c) => c.memberId === memberId)?.amount ?? 0,
      })));
      setPayments(await getEventPayments(id));
    } else {
      setContributions(ids.map((memberId) => ({ memberId, amount: 0 })));
      setEditing(true); // ainda não existe despesa: já abre no formulário
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await load(); }
      catch (err) { if (!cancelled) setLoadError(describeError(err)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [load]);

  // Status de pagamento ao vivo: você vê o outro confirmar sem recarregar.
  useEffect(() => {
    if (!id || !me) return;
    let unsub: (() => void) | undefined;
    pb.collection('wc_payments')
      .subscribe('*', () => { getEventPayments(id).then(setPayments).catch(() => {}); })
      .then((fn) => { unsub = fn; })
      .catch(() => {});
    return () => { unsub?.(); };
  }, [id, me]);

  const totalPaid = useMemo(
    () => contributions.reduce((s, c) => s + c.amount, 0),
    [contributions],
  );
  const balanced = Math.abs(totalPaid - totalCost) < 0.01;
  const sharePerPerson = members.length > 0 ? totalCost / members.length : 0;
  const nameOf = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name || 'Participante';

  const updateContribution = (memberId: string, amount: number) =>
    setContributions((prev) => prev.map((c) => (c.memberId === memberId ? { ...c, amount } : c)));

  const handleSave = async () => {
    if (!id) return;
    if (totalCost <= 0) { toast.error('Informe o valor total da conta'); return; }
    if (members.length === 0) { toast.error('Este evento não tem participantes'); return; }
    if (!balanced) {
      toast.error(`A soma do que cada um pagou (${formatBRL(totalPaid)}) precisa bater com o total (${formatBRL(totalCost)})`);
      return;
    }

    setSaving(true);
    try {
      const memberIds = members.map((m) => m.id);
      const transfers = calculateTransfers(memberIds, totalCost, contributions);
      await saveExpense(id, totalCost, contributions, transfers);
      await load();
      setEditing(false);
      toast.success('Divisão salva!');
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      if (id) setPayments(await getEventPayments(id));
      toast.success(ok);
    } catch (err) {
      toast.error(describeError(err));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="w-8 h-8 border-3 border-current/30 border-t-current rounded-full animate-spin"
          style={{ color: 'var(--md-primary)' }} role="status" aria-label="Carregando" />
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="text-center py-16 space-y-3">
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--md-outline)' }}>
          error_outline
        </span>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
          {loadError || 'Evento não encontrado'}
        </p>
        <Link to="/clubs" className="btn-text">Voltar aos clubes</Link>
      </div>
    );
  }

  const transfers = expense?.splits?.transfers || [];
  const myDebts = payments.filter((p) => p.debtor === me?.id);
  const myCredits = payments.filter((p) => p.creditor === me?.id);
  const canEdit = !expense || expense.paid_by === me?.id;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <Link to={`/events/${event.id}`} className="btn-text inline-flex items-center" style={{ paddingLeft: 0 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 20 }}>arrow_back</span>
        Voltar ao evento
      </Link>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 24, color: 'var(--md-primary)' }}>
            payments
          </span>
          <h1 className="type-headline-small" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Divisão da conta
          </h1>
        </div>
        <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>{event.title}</p>
      </div>

      {members.length === 0 && (
        <div className="card-outlined p-5 text-center" style={{ borderRadius: 'var(--shape-large)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: 36, color: 'var(--md-outline)' }}>
            group_off
          </span>
          <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>
            Este evento não tem participantes, então não há entre quem dividir.
          </p>
          <Link to={`/events/${event.id}/edit`} className="btn-text mt-2 inline-block">
            Editar participantes
          </Link>
        </div>
      )}

      {/* O meu resumo primeiro — é o que a pessoa abriu a página para ver */}
      {!editing && payments.length > 0 && (
        <div data-testid="my-summary" className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <h2 className="type-title-medium mb-3" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
            Você
          </h2>
          {myDebts.length === 0 && myCredits.length === 0 && (
            <p className="type-body-medium" style={{ color: 'var(--md-on-surface-variant)' }}>
              Você está quite — nada a pagar nem a receber.
            </p>
          )}
          {myDebts.map((p) => (
            <p key={p.id} className="type-body-medium" style={{ color: 'var(--md-on-surface)' }}>
              Você deve <strong>{formatBRL(p.amount)}</strong> a {nameOf(p.creditor)}
              {' · '}<span style={{ color: STATUS[p.status].color }}>{STATUS[p.status].label}</span>
            </p>
          ))}
          {myCredits.map((p) => (
            <p key={p.id} className="type-body-medium" style={{ color: 'var(--md-on-surface)' }}>
              {nameOf(p.debtor)} te deve <strong>{formatBRL(p.amount)}</strong>
              {' · '}<span style={{ color: STATUS[p.status].color }}>{STATUS[p.status].label}</span>
            </p>
          ))}
        </div>
      )}

      {/* Formulário */}
      {editing ? (
        <>
          <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
            <label className="type-label-large block mb-2" htmlFor="total-cost" style={{ color: 'var(--md-on-surface)' }}>
              Valor total (R$)
            </label>
            <input id="total-cost" type="number" data-testid="total-cost"
              value={totalCost || ''} onChange={(e) => setTotalCost(Number(e.target.value))}
              placeholder="0,00" step="0.01" min="0" className="input-outlined w-full text-center"
              style={{
                fontSize: 24, fontFamily: 'Playfair Display, serif', fontWeight: 700,
                color: 'var(--md-primary)', minHeight: 56, borderRadius: 'var(--shape-large)',
              }} />
            {totalCost > 0 && members.length > 0 && (
              <p className="type-body-small text-center mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>
                {formatBRL(sharePerPerson)} por pessoa ({members.length} participantes)
              </p>
            )}
          </div>

          <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
            <h2 className="type-title-medium mb-1" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
              Quem desembolsou?
            </h2>
            <p className="type-body-small mb-4" style={{ color: 'var(--md-on-surface-variant)' }}>
              Informe quanto cada pessoa pagou de fato. A soma precisa bater com o total.
            </p>
            <div className="space-y-3">
              {members.map((member) => {
                const c = contributions.find((x) => x.memberId === member.id);
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <label htmlFor={`paid-${member.id}`} className="type-body-medium flex-1 min-w-0 truncate"
                      style={{ color: 'var(--md-on-surface)' }}>
                      {member.name}{member.id === me?.id ? ' (você)' : ''}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="type-label-small" style={{ color: 'var(--md-on-surface-variant)' }}>R$</span>
                      <input id={`paid-${member.id}`} type="number" data-testid={`paid-${member.id}`}
                        value={c?.amount || ''} onChange={(e) => updateContribution(member.id, Number(e.target.value))}
                        placeholder="0,00" step="0.01" min="0" className="input-outlined w-28 text-right"
                        style={{ minHeight: 48, borderRadius: 'var(--shape-medium)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 flex justify-between type-body-medium"
              style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
              <span style={{ color: 'var(--md-on-surface-variant)' }}>Soma informada:</span>
              <span data-testid="total-paid" style={{
                fontWeight: 700, color: balanced ? '#2E7D32' : 'var(--md-error)',
              }}>{formatBRL(totalPaid)}</span>
            </div>
            {!balanced && totalCost > 0 && (
              <p className="type-body-small mt-2" style={{ color: 'var(--md-error)' }}>
                Faltam {formatBRL(totalCost - totalPaid)} para fechar com o total.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || members.length === 0}
              data-testid="save-split" className="btn-primary flex-1"
              style={{ height: 48, borderRadius: 'var(--shape-large)', opacity: saving ? 0.7 : 1 }}>
              <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20 }}>calculate</span>
              {saving ? 'Salvando...' : 'Calcular e salvar'}
            </button>
            {expense && (
              <button onClick={() => { setEditing(false); load(); }} className="btn-outlined"
                style={{ height: 48, borderRadius: 'var(--shape-large)', padding: '0 20px' }}>
                Cancelar
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>Total da conta</p>
              <p className="type-headline-small" style={{
                fontFamily: 'Playfair Display, serif', color: 'var(--md-primary)',
              }}>{formatBRL(expense?.total_amount || 0)}</p>
              <p className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                {formatBRL(sharePerPerson)} por pessoa · {members.length} participantes
              </p>
            </div>
            {canEdit && (
              <button onClick={() => setEditing(true)} className="btn-outlined" data-testid="edit-split"
                style={{ borderRadius: 'var(--shape-full)', padding: '10px 18px' }}>
                <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>edit</span>
                Editar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transferências */}
      {!editing && transfers.length > 0 && (
        <div className="card-outlined p-5" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-rounded ms-filled" style={{ fontSize: 20, color: 'var(--md-primary)' }}>
              swap_horiz
            </span>
            <h2 className="type-title-medium" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--md-on-surface)' }}>
              Transferências
            </h2>
          </div>
          <div className="space-y-3">
            {payments.map((p) => {
              const cfg = STATUS[p.status];
              const isDebtor = me?.id === p.debtor;
              const isCreditor = me?.id === p.creditor;
              return (
                <div key={p.id} data-testid={`transfer-${p.debtor}-${p.creditor}`} className="p-4"
                  style={{ background: 'var(--md-surface-container)', borderRadius: 'var(--shape-large)' }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="type-label-large" style={{ color: 'var(--md-on-surface)' }}>
                      {nameOf(p.debtor)}
                    </span>
                    <span className="material-symbols-rounded" aria-hidden="true"
                      style={{ fontSize: 16, color: 'var(--md-outline)' }}>arrow_forward</span>
                    <span className="type-label-large" style={{ color: 'var(--md-on-surface)' }}>
                      {nameOf(p.creditor)}
                    </span>
                    <span className="ml-auto type-title-small font-bold" style={{ color: 'var(--md-tertiary)' }}>
                      {formatBRL(p.amount)}
                    </span>
                  </div>

                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 'var(--shape-full)',
                    background: cfg.bg, marginBottom: 8,
                  }}>
                    <span className="material-symbols-rounded" aria-hidden="true"
                      style={{ fontSize: 14, color: cfg.color }}>{cfg.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  </div>

                  {isDebtor && p.pix_key && (
                    <div className="flex items-center gap-2 py-2" style={{ borderTop: '1px solid var(--md-outline-variant)' }}>
                      <span className="pix-badge">PIX</span>
                      <span className="type-body-small flex-1 truncate" style={{ color: 'var(--md-on-surface-variant)' }}>
                        {p.pix_key}
                      </span>
                      <button onClick={() => {
                        navigator.clipboard.writeText(p.pix_key!);
                        toast.success('Chave Pix copiada');
                      }} style={{
                        background: '#1F8A7C', color: 'white', fontSize: 12, fontWeight: 600,
                        padding: '6px 12px', borderRadius: 'var(--shape-medium)',
                        border: 'none', cursor: 'pointer', minHeight: 32,
                      }}>Copiar</button>
                    </div>
                  )}

                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isDebtor && (p.status === 'pending' || p.status === 'disputed') && (
                      <button data-testid={`mark-paid-${p.id}`}
                        onClick={() => act(() => markAsPaid(p.id), 'Marcado como pago')}
                        style={{
                          flex: 1, minWidth: 140, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 6, padding: '10px 16px',
                          borderRadius: 'var(--shape-large)', background: '#1F8A7C',
                          color: 'white', border: 'none', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>check</span>
                        Já paguei
                      </button>
                    )}

                    {isCreditor && p.status === 'paid' && (
                      <>
                        <button data-testid={`confirm-${p.id}`}
                          onClick={() => act(() => confirmPayment(p.id), 'Recebimento confirmado')}
                          style={{
                            flex: 1, minWidth: 140, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 6, padding: '10px 16px',
                            borderRadius: 'var(--shape-large)', background: '#2E7D32',
                            color: 'white', border: 'none', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>check_circle</span>
                          Confirmar recebimento
                        </button>
                        <button data-testid={`dispute-${p.id}`}
                          onClick={() => act(() => disputePayment(p.id), 'Pagamento contestado')}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            padding: '10px 16px', borderRadius: 'var(--shape-large)',
                            background: 'rgba(186,26,26,0.08)', color: 'var(--md-error)',
                            border: '1px solid var(--md-error)', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                          Contestar
                        </button>
                      </>
                    )}

                    {isDebtor && p.status === 'paid' && (
                      <span className="type-body-small" style={{ color: 'var(--md-on-surface-variant)' }}>
                        Aguardando {nameOf(p.creditor)} confirmar...
                      </span>
                    )}
                    {p.status === 'confirmed' && (
                      <span className="type-body-small" style={{ color: '#2E7D32' }}>
                        Acertado.
                      </span>
                    )}
                    {isCreditor && p.status === 'disputed' && (
                      <span className="type-body-small" style={{ color: 'var(--md-error)' }}>
                        Você contestou — {nameOf(p.debtor)} pode marcar como pago de novo.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!editing && expense && transfers.length === 0 && (
        <div className="card-elevated text-center py-8" style={{ borderRadius: 'var(--shape-extra-large)' }}>
          <span className="material-symbols-rounded ms-filled" style={{ fontSize: 40, color: '#2E7D32' }}>
            check_circle
          </span>
          <p className="type-body-medium mt-2" style={{ color: 'var(--md-on-surface-variant)' }}>
            Todo mundo quite — nenhuma transferência necessária.
          </p>
        </div>
      )}
    </div>
  );
};
