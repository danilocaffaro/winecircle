/// <reference path="../pb_data/types.d.ts" />

// Fase 1 — perfis públicos mínimos (A-13)
//
// A regra de listagem de `users` é `id = @request.auth.id` (padrão do
// PocketBase), então getUsers() devolvia só você mesmo — e toda lista de
// membros, chip de participante e tabela de rankings individuais aparecia
// vazia ou com uma pessoa só.
//
// Afrouxar a regra de `users` vazaria e-mail e chave Pix. Em vez disso, uma
// view collection expõe exatamente três colunas e nada mais. A chave Pix
// continua chegando a quem precisa por outro caminho: wc_payments guarda uma
// cópia dela no momento do acerto, e só devedor e credor leem aquele registro.

migrate((app) => {
  const collection = new Collection({
    "type": "view",
    "id": "pbc_wc_profiles",
    "name": "wc_profiles",
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [],
    "indexes": [],
    "system": false,
    "viewQuery": "SELECT id, display_name, avatar_url FROM users"
  })

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_wc_profiles")

  return app.delete(collection)
})
