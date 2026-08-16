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

routerAdd("POST", "/api/wc/join", (e) => {
  const auth = e.auth
  if (!auth) throw new UnauthorizedError("Autenticação necessária")

  const body = e.requestInfo().body || {}
  const clubId = body.club
  if (!clubId) throw new BadRequestError("Informe o clube")

  let club
  try {
    club = e.app.findRecordById("wc_clubs", clubId)
  } catch (err) {
    throw new NotFoundError("Clube não encontrado")
  }

  const members = club.get("members") || []
  if (members.indexOf(auth.id) !== -1) {
    return e.json(200, { ok: true, already: true, members: members.length })
  }

  members.push(auth.id)
  club.set("members", members)
  e.app.save(club)

  return e.json(200, { ok: true, already: false, members: members.length })
}, $apis.requireAuth())

routerAdd("POST", "/api/wc/leave", (e) => {
  const auth = e.auth
  if (!auth) throw new UnauthorizedError("Autenticação necessária")

  const body = e.requestInfo().body || {}
  const clubId = body.club
  if (!clubId) throw new BadRequestError("Informe o clube")

  let club
  try {
    club = e.app.findRecordById("wc_clubs", clubId)
  } catch (err) {
    throw new NotFoundError("Clube não encontrado")
  }

  // O dono não pode sair e deixar o clube órfão — precisa excluir ou
  // transferir a propriedade primeiro.
  if (club.get("owner") === auth.id) {
    throw new BadRequestError("O dono não pode sair do próprio clube")
  }

  const members = (club.get("members") || []).filter((id) => id !== auth.id)
  club.set("members", members)
  e.app.save(club)

  return e.json(200, { ok: true, members: members.length })
}, $apis.requireAuth())
