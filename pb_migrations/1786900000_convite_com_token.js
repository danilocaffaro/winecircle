/// <reference path="../pb_data/types.d.ts" />

// O convite vira um segredo de verdade
//
// O link de convite era `/join/<id do clube>` — e o id não é segredo nenhum:
// `wc_clubs` tinha `listRule: "@request.auth.id != \"\""`, então qualquer conta
// autenticada listava todos os clubes do sistema com seus ids. Somando isso a
// um `/api/wc/join` que aceitava qualquer id sem perguntar de onde ele veio,
// entrar em todos os clubes da instância eram três requisições:
//
//   GET  /api/collections/wc_clubs/records   → ids de todos
//   POST /api/wc/join {"club": "<id>"}       → membro de qualquer um
//
// E ser membro dá leitura de wc_events, wc_ratings e wc_expenses do clube.
//
// A regra estava aberta por um motivo real: a página de convite precisa mostrar
// o clube para quem ainda não é membro. A saída é `invite_token` — um segredo
// que viaja no link. Com ele, a tela de convite passa a ser servida por
// `GET /api/wc/invite` (em pb_hooks/club_membership.pb.js), que devolve só nome
// e descrição mediante token válido, e a collection pode finalmente fechar em
// dono-ou-membro.
//
// O token não é `required`: adicionar campo obrigatório a uma collection com
// registros existentes falharia. Os clubes que já existem recebem o token no
// backfill abaixo; os novos, pelo autogeneratePattern. Token vazio é tratado
// como convite inválido no hook, nunca como "qualquer um entra".
//
// Links antigos param de funcionar. É o corte limpo: quem precisar, remanda.

migrate((app) => {
  const clubs = app.findCollectionByNameOrId("pbc_2816488861")

  clubs.fields.add(new Field({
    "autogeneratePattern": "[a-zA-Z0-9]{24}",
    "hidden": false,
    "id": "text_club_invite_token",
    "max": 24,
    "min": 0,
    "name": "invite_token",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // Só dono e membros enxergam o clube. Quem chega pelo convite é atendido
  // pelo /api/wc/invite, que roda com privilégio e exige o token.
  unmarshal({
    "listRule": "owner = @request.auth.id || members.id ?= @request.auth.id",
    "viewRule": "owner = @request.auth.id || members.id ?= @request.auth.id"
  }, clubs)

  app.save(clubs)

  // Backfill dos clubes que já existem
  const existentes = app.findAllRecords("wc_clubs")
  for (const r of existentes) {
    if (!r.getString("invite_token")) {
      r.set("invite_token", $security.randomString(24))
      app.save(r)
    }
  }

  return null
}, (app) => {
  const clubs = app.findCollectionByNameOrId("pbc_2816488861")
  clubs.fields.removeById("text_club_invite_token")

  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, clubs)

  return app.save(clubs)
})
