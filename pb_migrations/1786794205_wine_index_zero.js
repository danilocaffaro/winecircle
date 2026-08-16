/// <reference path="../pb_data/types.d.ts" />

// wine_index precisa aceitar zero
//
// O PocketBase valida campos numéricos obrigatórios com uma checagem de
// "blank" que trata 0 como ausente: gravar wine_index = 0 devolvia
// "validation_required: Cannot be blank". Como o primeiro vinho de todo evento
// tem índice 0, o envio do ranking falhava sempre nele — e como as gravações
// vão num Promise.all, os outros três vinhos entravam e a submissão inteira
// era reportada como erro. Sintoma: as notas apareciam pela metade e o botão
// nunca mudava para "Atualizar".
//
// A obrigatoriedade não se perde: o índice único (event, user, wine_index)
// continua garantindo uma linha por vinho, e submitMyRanking sempre preenche.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3013427899")

  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number2696493725",
    "max": null,
    "min": 0,
    "name": "wine_index",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3013427899")

  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number2696493725",
    "max": null,
    "min": null,
    "name": "wine_index",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
})
