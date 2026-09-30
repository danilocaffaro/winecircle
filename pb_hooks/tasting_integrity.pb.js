routerAdd("GET", "/api/wc/event-progress", (e) => {
  const lib = require(`${__hooks}/lib_tasting.js`)
  const event = lib.eventFor(e.app, e.requestInfo().query.event, e.auth)
  return e.json(200, { submitted: lib.progress(e.app, event), status: event.getString("status") })
}, $apis.requireAuth())

// All rows commit together, or none do. Re-read status inside the transaction.
routerAdd("POST", "/api/wc/ranking", (e) => {
  const body = e.requestInfo().body || {}
  e.app.runInTransaction((tx) => {
    const lib = require(`${__hooks}/lib_tasting.js`)
    const event = lib.eventFor(tx, body.event, e.auth)
    if (event.getString("status") !== "tasting") throw new BadRequestError("Esta votação está encerrada ou ainda não começou")
    if (event.getStringSlice("participants").indexOf(e.auth.id) === -1) throw new ForbiddenError("Você não participa desta degustação")
    const wines = lib.json(event.get("wines")) || []
    const order = body.order
    if (!Array.isArray(order) || !wines.length || order.length !== wines.length ||
        new Set(order).size !== wines.length || order.some((i) => !Number.isInteger(i) || i < 0 || i >= wines.length)) {
      throw new BadRequestError("Envie uma classificação completa, sem vinhos repetidos")
    }
    const notes = body.notes || {}
    const rows = tx.findRecordsByFilter("wc_ratings", "event = {:event} && user = {:user}", "", 1000, 0, { event: event.id, user: e.auth.id })
    const collection = tx.findCollectionByNameOrId("wc_ratings")
    order.forEach((wine, position) => {
      const note = notes[wine] || {}
      const stars = note.stars === undefined ? 0 : note.stars
      if (!Number.isInteger(stars) || stars < 0 || stars > 5) throw new BadRequestError("A nota deve estar entre 0 e 5")
      const record = rows.find((r) => r.getInt("wine_index") === wine) || new Record(collection)
      record.set("event", event.id)
      record.set("user", e.auth.id)
      record.set("wine_index", wine)
      record.set("rank", position + 1)
      record.set("stars", stars)
      for (const field of ["aroma", "palate", "finish"]) {
        const text = note[field] === undefined ? "" : note[field]
        if (typeof text !== "string" || text.length > 500) throw new BadRequestError("As notas devem ter até 500 caracteres")
        record.set("note_" + field, text)
      }
      tx.save(record)
    })
  })
  return e.json(200, { ok: true })
}, $apis.requireAuth())

onRecordCreateRequest((e) => {
  if (e.requestInfo().hasSuperuserAuth()) return e.next()
  const body = require(`${__hooks}/lib_tasting.js`).winesFromRequest(e)
  if (!body.wines || !body.wines.length) throw new BadRequestError("Informe os vinhos da degustação")
  e.record.set("wines", body.wines)
  return e.next()
}, "wc_events")

onRecordUpdateRequest((e) => {
  if (e.requestInfo().hasSuperuserAuth()) return e.next()
  return require(`${__hooks}/lib_tasting.js`).update(e,
    ["title", "club", "date", "type", "status", "wines", "participants", "created_by"],
    (record, old, info, body) => {
      const has = (field) => Object.keys(body).some((key) => key.replace(/^[+-]|[+-]$/g, "") === field)
      for (const field of ["club", "created_by"]) {
        if (has(field)) throw new BadRequestError("O clube e o organizador não podem ser alterados")
      }
      if (old.getString("status") !== "upcoming") {
        for (const field of ["wines", "participants", "type"]) {
          if (has(field)) throw new BadRequestError("Os vinhos e participantes ficam fixos após o início")
        }
      }
      const status = record.getString("status")
      if (status !== old.getString("status")) {
        const next = { upcoming: "tasting", tasting: "completed" }
        if (next[old.getString("status")] !== status) throw new BadRequestError("Esta mudança de fase não é permitida")
      }
    }, require(`${__hooks}/lib_tasting.js`).winesFromRequest(e))
}, "wc_events")

// Responses and realtime must not disclose bottle identities to blind tasters.
onRecordEnrich((e) => {
  e.record.unhide("wines")
  if (e.requestInfo.hasSuperuserAuth() || e.record.getString("type") !== "blind" ||
      e.record.getString("status") === "completed" || e.requestInfo.auth?.id === e.record.getString("created_by")) return e.next()
  const wines = require(`${__hooks}/lib_tasting.js`).json(e.record.get("wines")) || []
  e.record.set("wines", wines.map((wine, index) => ({ id: "blind-" + index, name: "" })))
  return e.next()
}, "wc_events")

onRecordUpdateRequest((e) => {
  const info = e.requestInfo()
  if (info.hasSuperuserAuth()) return e.next()
  return require(`${__hooks}/lib_tasting.js`).update(e,
    ["expense", "amount", "debtor", "creditor", "pix_key", "status", "paid_at", "confirmed_at"],
    (record, old) => {
      const body = info.body || {}
      const has = (field) => Object.keys(body).some((key) => key.replace(/^[+-]|[+-]$/g, "") === field)
      for (const field of ["expense", "amount", "debtor", "creditor", "pix_key"]) {
        if (has(field)) throw new BadRequestError("Os dados do pagamento não podem ser alterados")
      }
      const status = record.getString("status")
      const before = old.getString("status")
      const user = info.auth?.id
      const debtor = user === old.getString("debtor")
      const creditor = user === old.getString("creditor")
      if (status === before && (status === "paid" && debtor || (status === "confirmed" || status === "disputed") && creditor)) {
        record.set("paid_at", old.get("paid_at"))
        record.set("confirmed_at", old.get("confirmed_at"))
        return
      }
      if (status === "paid" && debtor && (before === "pending" || before === "disputed")) {
        record.set("paid_at", new Date().toISOString())
        record.set("confirmed_at", "")
      } else if ((status === "confirmed" || status === "disputed") && creditor && before === "paid") {
        record.set("confirmed_at", status === "confirmed" ? new Date().toISOString() : "")
        record.set("paid_at", old.get("paid_at"))
      } else {
        throw new ForbiddenError("Só quem recebe pode confirmar ou contestar um pagamento marcado como pago")
      }
    })
}, "wc_payments")
