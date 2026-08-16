/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3013427899")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3013427899")

  // update collection data
  unmarshal({
    "deleteRule": "user = @request.auth.id",
    "updateRule": "user = @request.auth.id"
  }, collection)

  return app.save(collection)
})
