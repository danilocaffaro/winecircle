// Provedor de LLM plugável — nenhum fornecedor específico é obrigatório.
//
// A única exigência é um endpoint compatível com a API de chat da OpenAI,
// configurado em duas variáveis:
//
//   WC_LLM_BASE_URL   ex.: http://127.0.0.1:8787/v1  (OmniRoute local)
//                          https://api.groq.com/openai/v1
//   WC_LLM_API_KEY    a chave do provedor (vazia se o gateway já cuida disso)
//   WC_LLM_MODEL      ex.: llama-3.3-70b-versatile
//
// Sem WC_LLM_BASE_URL, resolveWine devolve null e o app segue com o catálogo
// local e entrada manual — que é o caminho padrão, sem chave nenhuma.
//
// Por que um gateway como o OmniRoute (MIT, auto-hospedado) vale a pena aqui:
// ele expõe um endpoint só na frente de dezenas de free tiers e faz o fallback
// quando uma cota acaba. Assim o app não fica preso a um fornecedor — que era
// exatamente o problema com a chave do Gemini embutida no bundle.

const PROMPT = 'Você é um especialista em vinhos. Para a consulta "%Q%", ' +
  'retorne SOMENTE um objeto JSON válido, sem markdown, com as chaves: ' +
  'name (nome completo incluindo a safra), producer, region, country, grape, ' +
  'year (número), tastingNotes (2-3 frases em português), ' +
  'type (um de: red, white, rosé, sparkling, dessert, orange), ' +
  'price (número em BRL ou null). ' +
  'Se não conhecer o vinho, responda {"unknown": true}.'

module.exports = {
  /** true se há provedor configurado. */
  available() {
    return !!process.env.WC_LLM_BASE_URL
  },

  /**
   * Resolve um vinho pelo nome. Devolve null quando não há provedor
   * configurado, quando o modelo não conhece, ou quando a chamada falha —
   * nunca lança, para que a tela possa cair na entrada manual.
   */
  resolveWine(query) {
    const base = process.env.WC_LLM_BASE_URL
    if (!base) return null

    const model = process.env.WC_LLM_MODEL || "auto/best-fast"
    const key = process.env.WC_LLM_API_KEY || ""

    try {
      const res = $http.send({
        url: base.replace(/\/+$/, "") + "/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { Authorization: "Bearer " + key } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: PROMPT.replace("%Q%", query) }],
          temperature: 0.2,
          // Sem isto o OmniRoute responde em streaming (chunks "data:") e o
          // parser aqui recebe texto que não é JSON.
          stream: false,
        }),
        // Modelo de free tier pode demorar; ninguém está esperando na tela
        // com o dedo no botão — a busca do catálogo já respondeu antes.
        timeout: 90,
      })

      if (res.statusCode !== 200) {
        console.log("[llm] HTTP " + res.statusCode + ": " + String(res.raw).slice(0, 200))
        return null
      }

      const texto = res.json?.choices?.[0]?.message?.content
      if (!texto) return null

      // Modelos de free tier costumam cercar o JSON com crases mesmo quando
      // o prompt pede o contrário; e às vezes escrevem uma frase antes dele.
      let limpo = String(texto).replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      const abre = limpo.indexOf("{")
      const fecha = limpo.lastIndexOf("}")
      if (abre > 0 || (fecha > -1 && fecha < limpo.length - 1)) {
        limpo = limpo.slice(abre, fecha + 1)
      }
      const dados = JSON.parse(limpo)
      if (!dados || dados.unknown || !dados.name) return null

      return {
        name: String(dados.name),
        producer: dados.producer || undefined,
        region: dados.region || undefined,
        country: dados.country || undefined,
        grape: dados.grape || undefined,
        year: Number(dados.year) || undefined,
        tastingNotes: dados.tastingNotes || undefined,
        type: dados.type || undefined,
        price: Number(dados.price) || undefined,
      }
    } catch (err) {
      console.log("[llm] falhou: " + err)
      return null
    }
  },
}
