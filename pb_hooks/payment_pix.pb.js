/// <reference path="../pb_data/types.d.ts" />

// A chave Pix do credor entra no pagamento pelo servidor
//
// O devedor precisa da chave de quem vai receber, mas a view wc_profiles expõe
// só nome e avatar — de propósito, para que a chave de ninguém fique legível
// por qualquer usuário autenticado. Isso deixava quem monta o rateio sem a
// chave dos outros, e os pagamentos nasciam com pix_key vazia.
//
// Aqui o servidor preenche no momento da criação, lendo o registro do credor.
// A chave só é legível depois por devedor e credor daquele pagamento, que é
// exatamente quem precisa dela (regra de wc_payments).

// onRecordCreate (e não onRecordCreateRequest): os pagamentos são criados
// internamente pelo hook de reconciliação, via app.save(), e os hooks de
// *Request só disparam em requisição HTTP.
onRecordCreate((e) => {
  try {
    const creditor = e.record.getString("creditor")
    if (creditor) {
      const user = e.app.findRecordById("users", creditor)
      e.record.set("pix_key", user.getString("pix_key") || "")
    }
  } catch (err) {
    // Sem chave cadastrada não impede o acerto — só não dá o atalho de copiar
    console.log("[pix] não foi possível resolver a chave: " + err)
    e.record.set("pix_key", "")
  }

  return e.next()
}, "wc_payments")

// Se a pessoa cadastrar ou trocar a chave depois, os acertos ainda pendentes
// passam a mostrar a chave nova em vez de continuarem vazios.
onRecordAfterUpdateSuccess((e) => {
  try {
    const old = e.record.original()
    const novaChave = e.record.getString("pix_key")
    if (old && old.getString("pix_key") === novaChave) return e.next()

    const pendentes = e.app.findRecordsByFilter(
      "wc_payments",
      'creditor = {:id} && (status = "pending" || status = "disputed")',
      "-created", 200, 0, { id: e.record.id },
    )
    for (const p of pendentes) {
      p.set("pix_key", novaChave)
      e.app.save(p)
    }
    if (pendentes.length) {
      console.log("[pix] chave propagada para " + pendentes.length + " pagamento(s)")
    }
  } catch (err) {
    console.log("[pix] falha ao propagar: " + err)
  }

  return e.next()
}, "users")
