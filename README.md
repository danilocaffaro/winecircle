# Wine Circle

Degustações de vinho às cegas com os amigos. Cada participante ordena os vinhos
no próprio celular, sem ver o rótulo; o app apura por contagem de Borda, revela
o vencedor e divide a conta no Pix.

**Produção:** https://winecircle.melhor.dev

## Stack

React 19 · Vite · TypeScript · PocketBase 0.36 · Playwright

## Rodando localmente

```bash
npm install && (cd app && npm install)
```

Baixe o binário do PocketBase para `test/pb/` ([releases](https://github.com/pocketbase/pocketbase/releases/tag/v0.36.8)) e suba tudo:

```bash
npm run pb:test
```

```bash
npm run dev
```

O app sobe em http://127.0.0.1:5174 e, sem `VITE_POCKETBASE_URL` definida,
aponta para o PocketBase local da porta 8091 — que aplica as mesmas migrations e
hooks de produção.

Na primeira execução, crie o superusuário local:

```bash
cd test/pb && ./pocketbase superuser upsert test@local.dev "TesteLocal2026!" --dir=./pb_data
```

## Testes

```bash
npm run test:e2e
```

64 cenários de UI em Pixel 7 e Desktop Chrome, cobrindo as jornadas completas com
um contexto de navegador por participante. Os detalhes estão em
[test/PLANO-DE-TESTES.md](test/PLANO-DE-TESTES.md).

Os testes **recusam rodar** contra qualquer URL que não seja local — a suíte
anterior rodava contra produção e criava usuários reais a cada execução.

## Busca de vinhos

Sem chave de API. Um catálogo local de **244.577 vinhos** (união de duas fontes
abertas) alimenta o autocomplete e o preenchimento automático em ~25 ms. O que
não está nele pode ser resolvido por um LLM opcional — qualquer endpoint
compatível com a API da OpenAI — e o resultado é gravado de volta no catálogo.

## Como o modelo de dados funciona

O ponto central: um evento tem `wines` (JSON) e `participants`; cada pessoa grava
uma linha em `wc_ratings` por vinho, com a posição no ranking dela.

```
wc_clubs ──< wc_events ──< wc_ratings     (evento, usuário, vinho) → rank + notas
                  └──────< wc_expenses ──< wc_payments
```

`wine_index` é a posição do vinho no array do evento — estável, independente de
como a pessoa reordenou. É dele que sai o rótulo cego ("Vinho A"), que por isso
não muda quando você arrasta.

Uma linha por (evento, usuário, vinho), com índice único, é o que torna o envio
idempotente e imune a duas pessoas salvando ao mesmo tempo.

## Operação

Schema, hooks, segredos, deploy e regras de acesso: [DEPLOY-NOTES.md](DEPLOY-NOTES.md).

O schema é código versionado em `pb_migrations/`. Se você mexer no painel de
administração, traga a migration gerada para o repositório.
