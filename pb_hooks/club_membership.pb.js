/// <reference path="../pb_data/types.d.ts" />

// Entrar / sair de clube sem dar permissão de escrita no clube inteiro (A-14)
//
// Antes, joinClub() fazia um update direto no array `members` do clube. Isso
// obrigava a regra de update a aceitar qualquer usuário autenticado — e quem
// pode escrever `members` pode também renomear o clube, trocar o dono ou
// excluí-lo. A segurança tinha sido trocada pelo convite funcionar.
//
// Estas duas rotas fazem a única mutação legítima que um não-dono precisa:
// adicionar ou remover a si mesmo. O clube em si fica travado em
// `owner = @request.auth.id`.

// Ver o clube por trás de um convite, sem ser membro ainda
//
// A tela de convite precisa mostrar "Confraria da Quinta, 3 membros" para quem
// ainda está de fora — e era só por isso que `wc_clubs` ficava legível para
// qualquer autenticado, o que deixava todos os ids do sistema à mão. Aqui o
// token é o que autoriza, então a collection pôde fechar em dono-ou-membro.
//
// Sem exigir autenticação de propósito: quem abre o link ainda não entrou, e a
// tela oferece login depois de mostrar no que a pessoa está entrando. O segredo
// é o token, não a sessão. Devolve só nome, descrição e contagem — nunca a
// lista de membros nem o próprio token.
routerAdd("GET", "/api/wc/invite", (e) => {
  const q = e.requestInfo().query
  const clubId = String(q.club || "")
  const token = String(q.t || "")
  if (!clubId || !token) throw new BadRequestError("Convite incompleto")

  let club
  try {
    club = e.app.findRecordById("wc_clubs", clubId)
  } catch (err) {
    throw new NotFoundError("Convite inválido")
  }

  if (!require(`${__hooks}/lib_convite.js`).tokenConfere(club, token)) {
    throw new NotFoundError("Convite inválido")
  }

  return e.json(200, {
    club: {
      id: club.id,
      name: club.getString("name"),
      description: club.getString("description"),
      members: (club.get("members") || []).length,
    },
  })
})

routerAdd("POST", "/api/wc/join", (e) => {
  const body = e.requestInfo().body || {}
  if (!body.club) throw new BadRequestError("Informe o clube")
  let result
  e.app.runInTransaction((tx) => {
    let club
    try { club = tx.findRecordById("wc_clubs", String(body.club)) }
    catch (_) { throw new NotFoundError("Clube não encontrado") }
    const members = club.getStringSlice("members")
    const already = members.indexOf(e.auth.id) !== -1
    if (!already) {
      if (!require(`${__hooks}/lib_convite.js`).tokenConfere(club, String(body.token || ""))) throw new ForbiddenError("Convite inválido")
      members.push(e.auth.id)
      club.set("members", members)
      tx.save(club)
    }
    result = { ok: true, already, members: members.length }
  })
  return e.json(200, result)
}, $apis.requireAuth())

routerAdd("POST", "/api/wc/leave", (e) => {
  const body = e.requestInfo().body || {}
  if (!body.club) throw new BadRequestError("Informe o clube")
  let count
  e.app.runInTransaction((tx) => {
    const club = tx.findRecordById("wc_clubs", String(body.club))
    if (club.getString("owner") === e.auth.id) throw new BadRequestError("Transfira o clube antes de sair")
    const members = club.getStringSlice("members").filter((id) => id !== e.auth.id)
    club.set("members", members)
    tx.save(club)
    count = members.length
  })
  return e.json(200, { ok: true, members: count })
}, $apis.requireAuth())
