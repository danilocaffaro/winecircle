/// <reference path="../pb_data/types.d.ts" />

// Reconciliação dos pagamentos a partir da despesa (A-08)
//
// A primeira tentativa fazia isso no cliente: ler os pagamentos existentes,
// criar o que faltava, ajustar o resto. Não funciona — a regra de leitura de
// wc_payments só mostra os acertos em que você é devedor ou credor, então quem
// monta o rateio enxerga um subconjunto, conclui que os outros não existem e
// cria tudo de novo. Resultado: pagamento duplicado, e marcar um como pago
// deixa o gêmeo pendente para sempre.
//
// Aqui o servidor faz a reconciliação com visibilidade total. Preserva o
// status de quem já pagou ou confirmou: só cria o que falta, corrige valores e
// remove o que sumiu.
//
// Nota de implementação: cada handler do JSVM roda em escopo isolado e não
// enxerga funções declaradas no topo do arquivo, então a lógica precisa viver
// dentro do handler. O require abaixo carrega o módulo compartilhado.

onRecordAfterCreateSuccess((e) => {
  try {
    require(`${__hooks}/lib_settle.js`).reconcile(e.app, e.record)
  } catch (err) {
    console.log("[acerto] falha ao reconciliar (create): " + err)
  }
  return e.next()
}, "wc_expenses")

onRecordAfterUpdateSuccess((e) => {
  try {
    require(`${__hooks}/lib_settle.js`).reconcile(e.app, e.record)
  } catch (err) {
    console.log("[acerto] falha ao reconciliar (update): " + err)
  }
  return e.next()
}, "wc_expenses")
