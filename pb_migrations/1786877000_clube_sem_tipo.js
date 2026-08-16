/// <reference path="../pb_data/types.d.ts" />

// O clube deixa de ter modo de degustação
//
// `wc_clubs.type` (open/blind/mixed) competia com `wc_events.type` e não
// significava nada: quem decide se a degustação é às cegas é cada evento. Dois
// lugares para a mesma escolha só produzem contradição — um clube marcado como
// "aberto" com um evento "às cegas" dentro dele.
//
// O campo sai do schema junto com a interface, para não sobrar coluna morta
// que alguém volte a preencher por engano.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2816488861")
  collection.fields.removeById("select2363381545")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2816488861")

  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["open", "blind", "mixed"]
  }))

  return app.save(collection)
})
