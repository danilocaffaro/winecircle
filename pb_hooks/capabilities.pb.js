/// <reference path="../pb_data/types.d.ts" />

// O que este servidor consegue fazer
//
// Duas capacidades independentes:
//
//   catalog  — quantos vinhos há no catálogo local. Nunca precisa de chave.
//   aiSearch — se há um provedor de LLM configurado para resolver o que o
//              catálogo não tem. Opcional.
//
// O cliente usa isto para esconder o que não funciona em vez de oferecer um
// botão que sempre falha.

routerAdd("GET", "/api/wc/capabilities", (e) => {
  let catalogo = 0
  try {
    catalogo = e.app.countRecords("wc_wine_catalog")
  } catch (err) { /* collection ainda não existe */ }

  return e.json(200, {
    // Catálogo local: sempre disponível, sem chave
    catalog: catalogo,
    // Resolução por LLM: opcional, para o que não está no catálogo
    aiSearch: require(`${__hooks}/llm_provider.js`).available(),
  })
})
