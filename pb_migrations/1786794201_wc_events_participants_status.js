/// <reference path="../pb_data/types.d.ts" />

// Fase 1 — reconciliação de schema (A-03, A-04)
//
// O app sempre gravou `participants` em wc_events, mas o campo nunca existiu:
// o PocketBase descarta chaves desconhecidas em silêncio, então todo evento
// nascia sem participantes e o ciclo inteiro (degustação → resultado → conta)
// abria vazio.
//
// O código também gravava status 'completed', que não estava no enum — logo
// nenhum evento jamais era concluído. Os valores 'results' e 'closed' nunca
// foram usados por nenhuma linha e saem aqui.
//
// Nota: `rankings` NÃO é adicionado de propósito. No modelo multi-dispositivo
// os rankings vivem em wc_ratings, uma linha por (evento, usuário, vinho),
// o que elimina a corrida de last-write-wins do blob JSON único.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2136773829")

  // add field: participants
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation1204587666",
    "maxSelect": 50,
    "minSelect": 0,
    "name": "participants",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field: status — enum alinhado ao vocabulário do app
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "upcoming",
      "tasting",
      "completed"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2136773829")

  collection.fields.removeById("relation1204587666")

  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "upcoming",
      "tasting",
      "results",
      "closed"
    ]
  }))

  return app.save(collection)
})
