/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2816488861")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2816488861")

  // update collection data
  unmarshal({
    "deleteRule": "owner = @request.auth.id",
    "updateRule": "owner = @request.auth.id"
  }, collection)

  return app.save(collection)
})
