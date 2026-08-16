/// <reference path="../pb_data/types.d.ts" />

// Notificações de mudança de status de pagamento (A-11)
//
// A versão anterior era escrita contra uma API do PocketBase que não existe
// mais: onRecordAfterUpdateRequest (virou onRecordAfterUpdateSuccess),
// $app.dao() (removido na 0.23) e require('fs') — o runtime JS do PocketBase
// não é Node. O hook falhava no carregamento, então nenhuma notificação era
// enfileirada; o push-daemon rodava com a fila sempre vazia.

onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const status = record.getString("status")

  // Só interessa a transição de status
  const old = e.record.original()
  if (old && old.getString("status") === status) {
    return e.next()
  }

  try {
    const debtor = record.getString("debtor")
    const creditor = record.getString("creditor")
    const amount = record.getFloat("amount")

    const nameOf = (id) => {
      try {
        const u = e.app.findRecordById("users", id)
        return u.getString("display_name") || u.getString("email") || "Alguém"
      } catch (err) { return "Alguém" }
    }

    let target = null, title = "Wine Circle", body = ""
    const brl = "R$" + amount.toFixed(2).replace(".", ",")

    if (status === "paid") {
      target = creditor
      title = "Pagamento recebido"
      body = nameOf(debtor) + " marcou " + brl + " como pago — confirma o recebimento?"
    } else if (status === "confirmed") {
      target = debtor
      title = "Pagamento confirmado"
      body = nameOf(creditor) + " confirmou o recebimento de " + brl
    } else if (status === "disputed") {
      target = debtor
      title = "Pagamento contestado"
      body = nameOf(creditor) + " tem dúvidas sobre os " + brl
    }

    if (!target) return e.next()

    const subs = e.app.findRecordsByFilter(
      "wc_push_subs", "user = {:user}", "-created", 10, 0, { user: target }
    )
    if (!subs.length) {
      console.log("[push] sem inscrições para " + target)
      return e.next()
    }

    const payload = JSON.stringify({
      user: target, title, body, url: "/profile",
      subscriptions: subs.map((s) => ({
        endpoint: s.getString("endpoint"),
        keys: s.get("keys"),
      })),
    })

    // $os.writeFile sobrescreve; para uma fila append-only lemos e reescrevemos.
    // Volume é baixíssimo (uma linha por mudança de status), então serve.
    const QUEUE = "/tmp/wc-push-queue.jsonl"
    let existing = ""
    try { existing = toString($os.readFile(QUEUE)) } catch (err) { existing = "" }
    $os.writeFile(QUEUE, existing + payload + "\n", 0o644)

    console.log("[push] enfileirado para " + target + " (" + status + ")")
  } catch (err) {
    // Nunca derrubar a atualização do pagamento por causa da notificação
    console.log("[push] erro: " + err)
  }

  return e.next()
}, "wc_payments")
