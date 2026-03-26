/// <reference path="../types.d.ts" />

// Payment status change hook — sends push notifications
onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  const old = e.record?.originalCopy();

  // Only for wc_payments collection
  if (record.collection().name !== 'wc_payments') return;

  // Only if status changed
  if (!old || record.get('status') === old.get('status')) return;

  const status = record.getString('status');
  const debtor = record.getString('debtor');
  const creditor = record.getString('creditor');
  const amount = record.getFloat('amount');

  console.log(`[Push] Payment ${record.id} status changed to ${status}`);

  try {
    // Load user records to get names
    const debtorUser = $app.dao().findRecordById('users', debtor);
    const creditorUser = $app.dao().findRecordById('users', creditor);
    const debtorName = debtorUser.getString('display_name') || debtorUser.getString('email');
    const creditorName = creditorUser.getString('display_name') || creditorUser.getString('email');

    // Decide who to notify and what message
    let targetUser = null;
    let title = 'Wine Circle';
    let body = '';
    let url = '/profile';

    if (status === 'paid') {
      // Debtor marked as paid → notify creditor
      targetUser = creditor;
      title = 'Payment received!';
      body = `${debtorName} paid R$${amount.toFixed(2)} — confirm receipt?`;
    } else if (status === 'confirmed') {
      // Creditor confirmed → notify debtor
      targetUser = debtor;
      title = 'Payment confirmed!';
      body = `${creditorName} confirmed receiving R$${amount.toFixed(2)}`;
    } else if (status === 'disputed') {
      // Creditor disputed → notify debtor
      targetUser = debtor;
      title = 'Payment disputed';
      body = `${creditorName} has questions about the R$${amount.toFixed(2)} payment`;
    }

    if (!targetUser) return;

    // Load push subscriptions for target user
    const subs = $app.dao().findRecordsByFilter(
      'wc_push_subs',
      `user = "${targetUser}"`,
      '-created',
      10
    );

    if (subs.length === 0) {
      console.log(`[Push] No subscriptions for user ${targetUser}`);
      return;
    }

    // Send push via external script (cannot import web-push in PB hooks directly)
    // Instead, write to a queue file or trigger via HTTP
    const payload = JSON.stringify({
      user: targetUser,
      title,
      body,
      url,
      subscriptions: subs.map(s => ({
        endpoint: s.getString('endpoint'),
        keys: s.get('keys'),
      })),
    });

    // Write to /tmp/wc-push-queue.jsonl (newline-delimited JSON)
    const fs = require('fs');
    fs.appendFileSync('/tmp/wc-push-queue.jsonl', payload + '\n');
    console.log(`[Push] Queued notification for ${targetUser}`);

  } catch (err) {
    console.error('[Push] Error:', err);
  }
}, 'wc_payments');
