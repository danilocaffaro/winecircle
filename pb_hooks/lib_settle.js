// Módulo compartilhado pelos hooks de despesa.
//
// Fica fora do padrão *.pb.js de propósito: arquivos .pb.js são carregados
// como hooks pelo PocketBase, e este aqui é só uma biblioteca chamada via
// require() de dentro dos handlers.

module.exports = {
  /**
   * Sincroniza wc_payments com as transferências gravadas na despesa.
   *
   * Idempotente: rodar duas vezes com o mesmo rateio não muda nada. O par
   * (devedor, credor) é a identidade do acerto — enquanto ele existir no
   * rateio, o registro é preservado com o status que tiver.
   */
  reconcile(app, expense) {
    // Campos `json` chegam ao JSVM como raw (types.JSONRaw), não como objeto
    // JavaScript — ler `.transfers` direto devolve undefined em silêncio, e a
    // reconciliação vira um no-op sem erro nenhum.
    let splits = expense.get("splits")
    if (splits && typeof splits !== "object") splits = JSON.parse(String(splits))
    else if (splits && typeof splits.transfers === "undefined") {
      try { splits = JSON.parse(String(splits)) } catch (err) { /* já era objeto */ }
    }
    const transfers = (splits && splits.transfers) || []
    console.log("[acerto] despesa " + expense.id + ": " + transfers.length + " transferência(s)")

    const existentes = app.findRecordsByFilter(
      "wc_payments", "expense = {:id}", "-created", 500, 0, { id: expense.id },
    )

    const chave = (d, c) => d + "->" + c
    const porPar = {}
    for (let i = 0; i < existentes.length; i++) {
      const p = existentes[i]
      porPar[chave(p.getString("debtor"), p.getString("creditor"))] = p
    }

    const vistos = {}
    const coll = app.findCollectionByNameOrId("wc_payments")

    for (let i = 0; i < transfers.length; i++) {
      const t = transfers[i]
      const k = chave(t.fromMemberId, t.toMemberId)
      vistos[k] = true
      const atual = porPar[k]

      if (atual) {
        // Só o valor muda; status, paid_at e confirmed_at ficam intactos.
        if (Math.abs(atual.getFloat("amount") - t.amount) > 0.005) {
          atual.set("amount", t.amount)
          app.save(atual)
        }
      } else {
        const novo = new Record(coll)
        novo.set("expense", expense.id)
        novo.set("debtor", t.fromMemberId)
        novo.set("creditor", t.toMemberId)
        novo.set("amount", t.amount)
        novo.set("status", "pending")
        // pix_key entra pelo hook payment_pix
        app.save(novo)
      }
    }

    // Transferência que sumiu num recálculo — só apaga se ninguém mexeu nela
    for (let i = 0; i < existentes.length; i++) {
      const p = existentes[i]
      const k = chave(p.getString("debtor"), p.getString("creditor"))
      if (!vistos[k] && p.getString("status") === "pending") {
        app.delete(p)
      }
    }
  },
}
