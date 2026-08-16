/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3684999271")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id = debtor || @request.auth.id = creditor",
    "viewRule": "@request.auth.id = debtor || @request.auth.id = creditor"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3684999271")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
