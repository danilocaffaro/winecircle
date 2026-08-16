/// <reference path="../pb_data/types.d.ts" />

// Busca de vinhos: catálogo primeiro, IA só no que faltar
//
// Antes, toda tecla no autocomplete e todo "adicionar vinho" ia para o Gemini
// com uma chave que esteve pública dentro do bundle. Agora:
//
//   1. catálogo local (~245 mil vinhos, sem chave, ~25ms)
//   2. se não achar e houver provedor configurado, resolve com LLM
//   3. o resultado da IA é gravado no catálogo (source='ai')
//
// O passo 3 é o que mantém o catálogo vivo: as fontes abertas param em 2019,
// mas o que o seu grupo realmente bebe entra sozinho e nunca mais custa uma
// chamada externa.
//
// O provedor é qualquer endpoint compatível com OpenAI — OmniRoute na frente
// de dezenas de free tiers, Groq, Gemini via proxy, ou nada. Ver llm_provider.

routerAdd("GET", "/api/wc/wine-suggest", (e) => {
  const q = String(e.requestInfo().query.q || "").trim()
  if (q.length < 2) return e.json(200, { suggestions: [] })

  const norm = q.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()

  // Prefixo primeiro (usa o índice e é o que a pessoa costuma querer),
  // depois qualquer posição, sem repetir o que já veio.
  const vistos = {}
  const out = []

  const coletar = (filtro, params, limite) => {
    const rs = e.app.findRecordsByFilter(
      "wc_wine_catalog", filtro, "-points", limite, 0, params,
    )
    for (const r of rs) {
      const nome = r.getString("name")
      if (vistos[nome]) continue
      vistos[nome] = true
      out.push({
        id: r.id,
        name: nome,
        winery: r.getString("winery") || undefined,
        grape: r.getString("grape") || undefined,
        country: r.getString("country") || undefined,
        region: r.getString("region") || undefined,
        year: r.getInt("year") || undefined,
        type: r.getString("type") || undefined,
      })
    }
  }

  try {
    coletar("search ~ {:pre}", { pre: norm + "%" }, 8)
    if (out.length < 8) coletar("search ~ {:any}", { any: "%" + norm + "%" }, 8 - out.length)
  } catch (err) {
    console.log("[catálogo] falha na sugestão: " + err)
  }

  return e.json(200, { suggestions: out.slice(0, 8) })
}, $apis.requireAuth())

routerAdd("POST", "/api/wc/wine-resolve", (e) => {
  const body = e.requestInfo().body || {}
  const query = String(body.query || "").trim()
  if (!query) throw new BadRequestError("Digite o nome de um vinho")
  if (query.length > 200) throw new BadRequestError("Nome longo demais")

  const norm = query.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()

  // 1. Está no catálogo?
  //
  // Três tentativas, da mais precisa para a mais tolerante. A primeira versão
  // exigia igualdade exata do nome normalizado — e ninguém digita
  // "Château Margaux 2009  Margaux" com os dois espaços. Na prática o catálogo
  // de 245 mil vinhos nunca era consultado: toda busca caía no 503.
  const tentativas = [
    ["search = {:q}", { q: norm }],                 // exato
    ["search ~ {:q}", { q: norm + "%" }],           // começa com
    ["search ~ {:q}", { q: "%" + norm + "%" }],     // contém
  ]

  try {
    let achados = []
    for (const [filtro, params] of tentativas) {
      achados = e.app.findRecordsByFilter("wc_wine_catalog", filtro, "-points", 1, 0, params)
      if (achados.length) break
    }
    if (achados.length) {
      const r = achados[0]
      return e.json(200, {
        source: "catalog",
        wine: {
          name: r.getString("name"),
          producer: r.getString("winery") || undefined,
          grape: r.getString("grape") || undefined,
          country: r.getString("country") || undefined,
          region: r.getString("region") || undefined,
          year: r.getInt("year") || undefined,
          price: r.getFloat("price") || undefined,
          rating: r.getInt("points") ? Math.round(r.getInt("points") / 20 * 10) / 10 : undefined,
          tastingNotes: r.getString("notes") || undefined,
          type: r.getString("type") || undefined,
        },
      })
    }
  } catch (err) {
    console.log("[catálogo] falha na consulta: " + err)
  }

  // 2. Não está — precisa de um provedor
  const wine = require(`${__hooks}/llm_provider.js`).resolveWine(query)
  if (!wine) {
    throw new ApiError(503, "Não encontrei esse vinho no catálogo, e a busca por IA não está configurada. Você pode adicioná-lo manualmente.", null)
  }

  // 3. Grava de volta — o catálogo aprende com o uso do grupo
  try {
    const coll = e.app.findCollectionByNameOrId("wc_wine_catalog")
    const rec = new Record(coll)
    rec.set("name", String(wine.name || query).slice(0, 300))
    rec.set("search", String(wine.name || query).normalize("NFKD")
      .replace(/[̀-ͯ]/g, "").toLowerCase().slice(0, 300))
    rec.set("winery", wine.producer || "")
    rec.set("grape", wine.grape || "")
    rec.set("country", wine.country || "")
    rec.set("region", wine.region || "")
    rec.set("year", wine.year || 0)
    rec.set("points", 0)
    rec.set("price", wine.price || 0)
    rec.set("notes", String(wine.tastingNotes || "").slice(0, 800))
    rec.set("type", wine.type || "")
    rec.set("source", "ai")
    e.app.save(rec)
  } catch (err) {
    // Já existir é normal (corrida entre dois usuários); não atrapalha a resposta
    console.log("[catálogo] não gravei de volta: " + err)
  }

  return e.json(200, { source: "ai", wine })
}, $apis.requireAuth())
