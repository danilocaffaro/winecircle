/// <reference path="../pb_data/types.d.ts" />

// Campos created/updated em todas as collections
//
// Os scripts originais criaram as collections passando uma lista explícita de
// `fields` sem os campos autodate. Resultado: nenhuma tabela tinha `created`
// nem `updated` — e o app ordena por eles em vários lugares.
//
// Toda chamada com `sort: '-created'` devolvia HTTP 400 com a mensagem
// genérica "Something went wrong while processing your request", que o cliente
// engolia num console.error. Na prática: a lista de clubes do usuário
// (getMyClubs) e a lista de pagamentos nunca carregavam — falhavam caladas e a
// tela mostrava vazio, indistinguível de "você não tem nada ainda".
//
// Registros já existentes recebem o timestamp da migration; os novos passam a
// ser carimbados pelo PocketBase.

const COLLECTIONS = [
  ["pbc_2816488861", "clubs"],    // wc_clubs
  ["pbc_2136773829", "events"],   // wc_events
  ["pbc_3013427899", "ratings"],  // wc_ratings
  ["pbc_2598422542", "expenses"], // wc_expenses
  ["pbc_3684999271", "payments"], // wc_payments
  ["pbc_3753248830", "subs"],     // wc_push_subs
]

migrate((app) => {
  for (const [id, slug] of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(id)

    collection.fields.add(new Field({
      "hidden": false,
      "id": "autodate_created_" + slug,
      "name": "created",
      "onCreate": true,
      "onUpdate": false,
      "presentable": false,
      "system": false,
      "type": "autodate"
    }))

    collection.fields.add(new Field({
      "hidden": false,
      "id": "autodate_updated_" + slug,
      "name": "updated",
      "onCreate": true,
      "onUpdate": true,
      "presentable": false,
      "system": false,
      "type": "autodate"
    }))

    app.save(collection)
  }

  return null
}, (app) => {
  for (const [id, slug] of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(id)
    collection.fields.removeById("autodate_created_" + slug)
    collection.fields.removeById("autodate_updated_" + slug)
    app.save(collection)
  }

  return null
})
