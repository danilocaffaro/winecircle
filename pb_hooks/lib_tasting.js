module.exports = {
  // HTTP loads a record before acquiring the save transaction. Rebase only the
  // requested fields on a fresh record while holding the database transaction.
  update(e, fields, validate, extra) {
    const info = e.requestInfo()
    const pending = e.record
    const app = e.app
    const body = Object.assign({}, info.body || {}, extra || {})
    app.runInTransaction((tx) => {
      const current = tx.findRecordById(pending.collection().name, pending.id)
      const old = current.original()
      for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          current.set(field, extra && Object.prototype.hasOwnProperty.call(extra, field) ? extra[field] : pending.get(field))
        }
      }
      validate(current, old, info, body)
      e.record = current
      e.app = tx
      e.next()
    })
    e.app = app
  },
  winesFromRequest(e) {
    // The standard form strips hidden fields. Read only this explicitly
    // writable payload from the rereadable body, after API authorization.
    const body = new DynamicModel({ wines: nullArray() })
    e.bindBody(body)
    if (body.wines === null) return {}
    if (!Array.isArray(body.wines)) throw new BadRequestError("Envie a lista de vinhos")
    return { wines: body.wines }
  },
  json(value) {
    try { return JSON.parse(String(value)) } catch (_) { return value }
  },
  eventFor(app, id, auth) {
    let event
    try { event = app.findRecordById("wc_events", String(id || "")) }
    catch (_) { throw new NotFoundError("Degustação não encontrada") }
    const club = app.findRecordById("wc_clubs", event.getString("club"))
    if (!auth || club.getStringSlice("members").indexOf(auth.id) === -1) {
      throw new NotFoundError("Degustação não encontrada")
    }
    return event
  },
  progress(app, event) {
    const lib = require(`${__hooks}/lib_tasting.js`)
    const count = (lib.json(event.get("wines")) || []).length
    const ratings = app.findRecordsByFilter("wc_ratings", "event = {:id}", "user,rank", 10000, 0, { id: event.id })
    const byUser = {}
    for (const rating of ratings) {
      const user = rating.getString("user")
      if (!byUser[user]) byUser[user] = []
      byUser[user].push(rating)
    }
    return event.getStringSlice("participants").filter((user) => {
      const rows = byUser[user] || []
      return count > 0 && rows.length === count &&
        new Set(rows.map((r) => r.getInt("rank"))).size === count &&
        new Set(rows.map((r) => r.getInt("wine_index"))).size === count &&
        rows.every((r) => r.getInt("rank") >= 1 && r.getInt("rank") <= count &&
          r.getInt("wine_index") >= 0 && r.getInt("wine_index") < count)
    })
  },
}
