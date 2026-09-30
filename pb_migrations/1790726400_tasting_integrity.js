// New migration: validate locally; production application requires approval.
migrate((app) => {
  const events = app.findCollectionByNameOrId("wc_events")
  // Hidden fields cannot be filtered/sorted by clients. Enrich explicitly
  // returns the public projection (or the full gabarito after completion).
  events.fields.getByName("wines").hidden = true
  app.save(events)
  const ratings = app.findCollectionByNameOrId("wc_ratings")
  const member = '@request.auth.id != "" && event.club.members.id ?= @request.auth.id'
  unmarshal({
    listRule: member + ' && (user = @request.auth.id || event.status = "completed")',
    viewRule: member + ' && (user = @request.auth.id || event.status = "completed")',
    // Only the atomic ranking endpoint writes votes. Partial public writes are forbidden.
    createRule: null,
    updateRule: null,
    deleteRule: null,
  }, ratings)
  app.save(ratings)
  const payments = app.findCollectionByNameOrId("wc_payments")
  // Reconciliation creates payments internally. The public API only changes status.
  payments.createRule = null
  app.save(payments)
}, (app) => {
  const events = app.findCollectionByNameOrId("wc_events")
  events.fields.getByName("wines").hidden = false
  app.save(events)
  const ratings = app.findCollectionByNameOrId("wc_ratings")
  unmarshal({
    listRule: 'event.club.members.id ?= @request.auth.id',
    viewRule: 'event.club.members.id ?= @request.auth.id',
    createRule: 'user = @request.auth.id && event.participants.id ?= @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
  }, ratings)
  app.save(ratings)
  const payments = app.findCollectionByNameOrId("wc_payments")
  payments.createRule = 'expense.paid_by = @request.auth.id'
  app.save(payments)
})
