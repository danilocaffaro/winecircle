/// <reference path="../pb_data/types.d.ts" />

// Fase 1 — restaurar autorização por dono (A-12, A-14)
//
// As regras de escrita tinham sido afrouxadas para `@request.auth.id != ""`,
// o que deixava qualquer usuário logado renomear ou EXCLUIR qualquer clube e
// qualquer evento, e marcar qualquer pagamento como confirmado. A UI escondia
// os botões; a API não escondia nada.
//
// O afrouxamento não foi descuido: entrar num clube era um update no array
// `members` do próprio clube, então exigia permissão de escrita no registro
// inteiro. A saída é tirar o "entrar" do caminho de escrita direta — ele agora
// passa por POST /api/wc/join (pb_hooks/club_membership.pb.js), que adiciona
// só o solicitante e nada mais.
//
// list/view de wc_clubs continua aberto a autenticados de propósito: a página
// de convite precisa mostrar o clube para quem ainda não é membro.

migrate((app) => {
  const clubs = app.findCollectionByNameOrId("pbc_2816488861")
  unmarshal({
    "updateRule": "owner = @request.auth.id",
    "deleteRule": "owner = @request.auth.id"
  }, clubs)
  app.save(clubs)

  const events = app.findCollectionByNameOrId("pbc_2136773829")
  unmarshal({
    // criar evento: só quem é membro do clube
    "createRule": "@request.auth.id != \"\" && club.members.id ?= @request.auth.id",
    "updateRule": "created_by = @request.auth.id",
    "deleteRule": "created_by = @request.auth.id"
  }, events)
  app.save(events)

  const expenses = app.findCollectionByNameOrId("pbc_2598422542")
  unmarshal({
    "createRule": "paid_by = @request.auth.id && event.participants.id ?= @request.auth.id",
    "updateRule": "paid_by = @request.auth.id",
    "deleteRule": "paid_by = @request.auth.id"
  }, expenses)
  app.save(expenses)

  const payments = app.findCollectionByNameOrId("pbc_3684999271")
  unmarshal({
    // criar: só quem lançou a despesa monta as transferências
    "createRule": "expense.paid_by = @request.auth.id",
    // atualizar: devedor marca pago, credor confirma ou contesta
    "updateRule": "@request.auth.id = debtor || @request.auth.id = creditor",
    "deleteRule": null
  }, payments)
  app.save(payments)

  const subs = app.findCollectionByNameOrId("pbc_3753248830")
  unmarshal({
    "createRule": "user = @request.auth.id",
    "updateRule": "user = @request.auth.id",
    "deleteRule": "user = @request.auth.id"
  }, subs)
  app.save(subs)

  return null
}, (app) => {
  const ids = [
    "pbc_2816488861", "pbc_2136773829", "pbc_2598422542",
    "pbc_3684999271", "pbc_3753248830"
  ]
  for (const id of ids) {
    const c = app.findCollectionByNameOrId(id)
    unmarshal({
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.id != \"\"",
      "deleteRule": "@request.auth.id != \"\""
    }, c)
    app.save(c)
  }

  return null
})
