/// <reference path="../pb_data/types.d.ts" />

// Fase 1 — wc_ratings vira o registro canônico da degustação (A-10, A-15)
//
// A collection existia desde o início com o schema certo para notas numéricas
// (aroma/taste/finish/overall 1-10) mas nenhuma tela jamais a usou: os rankings
// eram gravados como um blob JSON único no evento, onde duas pessoas salvando
// ao mesmo tempo se sobrescreviam.
//
// Aqui ela passa a guardar o que a UI realmente coleta — a posição no ranking
// e as notas em texto livre — com uma linha por (evento, usuário, vinho).
// Zero linhas existentes, então a reestruturação não migra dados.
//
// O índice único é o que torna o upsert seguro: duas submissões concorrentes
// do mesmo usuário para o mesmo vinho colidem no banco em vez de duplicar.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3013427899")

  // Campos do modelo antigo (notas numéricas), nunca preenchidos
  collection.fields.removeById("number170592718")  // aroma
  collection.fields.removeById("number1775689304") // taste
  collection.fields.removeById("number550103832")  // finish
  collection.fields.removeById("number1767126347") // overall
  collection.fields.removeById("text18589324")     // notes

  // rank: posição no ranking do usuário, 1 = melhor
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number_rank",
    "max": null,
    "min": 1,
    "name": "rank",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // stars: avaliação individual 0-5 (0 = não avaliado)
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number_stars",
    "max": 5,
    "min": 0,
    "name": "stars",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false, "id": "text_note_aroma", "max": 500, "min": 0,
    "name": "note_aroma", "pattern": "", "presentable": false,
    "primaryKey": false, "required": false, "system": false, "type": "text"
  }))

  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false, "id": "text_note_palate", "max": 500, "min": 0,
    "name": "note_palate", "pattern": "", "presentable": false,
    "primaryKey": false, "required": false, "system": false, "type": "text"
  }))

  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false, "id": "text_note_finish", "max": 500, "min": 0,
    "name": "note_finish", "pattern": "", "presentable": false,
    "primaryKey": false, "required": false, "system": false, "type": "text"
  }))

  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_wc_ratings_event_user_wine` ON `wc_ratings` (`event`, `user`, `wine_index`)"
    ],
    // Ler: quem participa do clube do evento. Escrever: só as próprias notas.
    "listRule": "event.club.members.id ?= @request.auth.id",
    "viewRule": "event.club.members.id ?= @request.auth.id",
    "createRule": "user = @request.auth.id && event.participants.id ?= @request.auth.id",
    "updateRule": "user = @request.auth.id",
    "deleteRule": "user = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3013427899")

  collection.fields.removeById("number_rank")
  collection.fields.removeById("number_stars")
  collection.fields.removeById("text_note_aroma")
  collection.fields.removeById("text_note_palate")
  collection.fields.removeById("text_note_finish")

  unmarshal({
    "indexes": [],
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
