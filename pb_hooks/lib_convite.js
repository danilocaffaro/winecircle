// Módulo compartilhado pelos hooks de convite.
//
// Fica fora do padrão *.pb.js de propósito: arquivos .pb.js são carregados
// como hooks pelo PocketBase, e este aqui é só uma biblioteca chamada via
// require() de dentro dos handlers. Cada handler do JSVM roda em escopo
// isolado e não enxerga funções declaradas no topo do próprio arquivo — por
// isso a comparação vive aqui, e não em club_membership.pb.js.

module.exports = {
  /**
   * O token informado corresponde ao do clube?
   *
   * Clube sem token é convite inválido, nunca "qualquer um entra": o campo é
   * opcional no schema (adicionar coluna obrigatória a uma collection com
   * registros existentes falha), então a ausência precisa negar, não liberar.
   *
   * A comparação é de tempo constante. Um `===` vaza, pelo tempo de resposta,
   * quantos caracteres iniciais estavam certos — o que transforma adivinhar 24
   * caracteres num trabalho de tentar 62 valores por posição.
   */
  tokenConfere(club, informado) {
    const esperado = club.getString("invite_token") || ""
    if (!esperado || !informado) return false
    if (esperado.length !== informado.length) return false

    let diff = 0
    for (let i = 0; i < esperado.length; i++) {
      diff |= esperado.charCodeAt(i) ^ informado.charCodeAt(i)
    }
    return diff === 0
  },
}
