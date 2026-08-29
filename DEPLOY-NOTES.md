# Wine Circle — operação

## Infraestrutura

- **Frontend**: SPA React/Vite servida estaticamente de `/var/www/winecircle`
- **Backend**: PocketBase 0.36.8 em `127.0.0.1:8090` (`winecircle-pb.service`)
- **Proxy**: Caddy
- **DNS**: Cloudflare Tunnel → https://winecircle.melhor.dev

## Schema: migrations, não cliques

O schema do PocketBase é **código versionado** em `pb_migrations/`. O PocketBase
aplica o que estiver pendente ao iniciar.

Isso mudou depois de um episódio caro: o schema em produção só existia dentro da
instância, editado à mão pelo painel, e tinha divergido do que o app gravava. O
campo `participants` de `wc_events` nunca existiu — o PocketBase descarta chaves
desconhecidas em silêncio — então todo evento nascia sem participantes e o ciclo
inteiro (degustação → resultado → conta) abria vazio. Os scripts de setup que
existiam no repositório não conseguiam reproduzir o ambiente.

Para alterar o schema:

```bash
# 1. escreva a migration em pb_migrations/<timestamp>_descricao.js
# 2. valide localmente
npm run pb:test
# 3. envie e reinicie
scp pb_migrations/<arquivo>.js oracle:/home/ubuntu/pocketbase/pb_migrations/
ssh oracle 'sudo systemctl restart winecircle-pb.service'
```

Se você editar algo pelo painel de administração, o PocketBase gera a migration
correspondente em `pb_migrations/` no servidor — **traga o arquivo para o
repositório**, senão a divergência recomeça.

## Hooks

`pb_hooks/` é sincronizado para `/home/ubuntu/pocketbase/pb_hooks/`. O PocketBase
observa o diretório e reinicia sozinho ao detectar mudança.

| Arquivo | O que faz |
|---|---|
| `club_membership.pb.js` | `POST /api/wc/join` e `/leave` — entrar num clube sem dar permissão de escrita no clube inteiro. `GET /api/wc/invite` serve a tela de convite mediante token |
| `wine_search.pb.js` | `/api/wc/wine-suggest` e `/wine-resolve` — catálogo primeiro, LLM só no que faltar |
| `llm_provider.js` | Provedor plugável (qualquer endpoint compatível com OpenAI) |
| `expense_settle.pb.js` | Reconcilia `wc_payments` a partir do rateio da despesa |
| `payment_pix.pb.js` | Preenche a chave Pix do credor no pagamento |
| `payment_push.pb.js` | Enfileira notificações de mudança de status |
| `capabilities.pb.js` | `GET /api/wc/capabilities` — diz ao cliente se a busca por IA está disponível |
| `lib_convite.js` | Compara o token do convite, em tempo constante |
| `lib_settle.js` | Módulo compartilhado (não é `.pb.js`, logo não é carregado como hook) |

**Armadilha do JSVM:** cada handler roda em escopo isolado e não enxerga funções
declaradas no topo do arquivo. Lógica compartilhada precisa vir de um
`require()`. Campos `json` chegam como raw — é preciso `JSON.parse`. E
`onRecord*Request` só dispara em requisição HTTP; para gravações internas via
`app.save()`, use os hooks de modelo (`onRecordCreate`).

## Segredos

Nada secreto entra no bundle. Tudo que começa com `VITE_` é injetado no
JavaScript entregue ao browser — `app/.env.production` contém apenas a URL do
backend e a chave VAPID **pública**.

**Hoje não há nenhuma chave de API em uso.** O catálogo local de ~245 mil
vinhos cobre autocomplete e preenchimento automático sem tocar em serviço
externo — era esse o único uso da chave do Gemini que ficou pública no bundle.

Se um dia quiser resolver vinhos fora do catálogo, `/home/ubuntu/pocketbase/wc.env`
(modo 600) aceita qualquer endpoint compatível com a API da OpenAI:

```
WC_LLM_BASE_URL=http://127.0.0.1:8787/v1   # OmniRoute local, ou
WC_LLM_BASE_URL=https://api.groq.com/openai/v1
WC_LLM_API_KEY=...
WC_LLM_MODEL=llama-3.3-70b-versatile
```

O que a IA resolve é **gravado de volta no catálogo** (`source='ai'`), então
cada vinho custa no máximo uma chamada — e o catálogo aprende com o que o
grupo bebe, que é a única atualização que importa: as fontes abertas param
em 2019.

O CI falha se um padrão de chave de API aparecer no `dist/`.

A senha do superusuário do PocketBase fica em `/opt/sharevault/winecircle.env`
(modo 600), rotacionada em 15/08/2026 — a anterior estava em texto plano no
repositório.

## Painel de administração

**Não é acessível publicamente** — `/pb/_/` responde 403 no Caddy. Para
administrar, use um túnel:

```bash
ssh -L 8090:127.0.0.1:8090 oracle
```

E abra http://localhost:8090/_/

## Deploy

Automático não está ligado: `deploy.yml` roda por `workflow_dispatch`. O CI
(build + lint + type check + 122 execuções de UI) roda em todo push e PR.

```bash
gh workflow run deploy.yml
```

O workflow publica **backend antes de frontend**: backup do `pb_data` (mantendo
os 5 últimos), sincroniza `pb_migrations/` e `pb_hooks/`, reinicia o PocketBase,
confere que ele voltou e que os hooks carregaram — e só então ativa o `dist/`.

Ele publicava só o `dist/` até 29/08/2026. Hooks e migrations iam à mão, e nada
garantia que fossem juntos: um deploy de frontend depois de uma mudança de
backend entregava um app chamando rota que o servidor não tinha.

`pb_migrations/` sincroniza **sem** `--delete` — apagar o arquivo de uma
migration já aplicada não a desfaz, só destrói o registro do que foi aplicado.
`pb_hooks/` sincroniza **com** `--delete`: aqui o repositório é a fonte da
verdade, e um hook removido daqui que continuasse no servidor seguiria
atendendo rota. Se houver migration só no servidor, o deploy avisa (e não
bloqueia) para você trazê-la ao repositório.

**Os secrets `DEPLOY_SSH_KEY`, `DEPLOY_HOST` e `DEPLOY_USER` ainda não existem
no repositório público** — ficaram no antigo, na migração que tirou do histórico
a chave de API que não podia ser revogada. Até recriá-los com `gh secret set`,
o workflow falha no `Setup SSH` e o caminho é o manual abaixo.

Manualmente, a partir da máquina de desenvolvimento — backend primeiro:

```bash
scp pb_migrations/*.js oracle:/home/ubuntu/pocketbase/pb_migrations/
scp pb_hooks/*.js oracle:/home/ubuntu/pocketbase/pb_hooks/
ssh oracle 'sudo systemctl restart winecircle-pb.service'

cd app && npm run build
rsync -az --delete dist/ oracle:/tmp/winecircle-staging/
ssh oracle 'sudo /usr/local/bin/winecircle-deploy-activate.sh'
```

## Backup

O `pb_data` inteiro cabe em poucas centenas de KB:

```bash
ssh oracle 'tar czf /home/ubuntu/backups/pb_data-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /home/ubuntu/pocketbase pb_data'
```

Vale automatizar num cron antes do próximo ciclo de mudanças.

## Catálogo de vinhos

`wc_wine_catalog` — 244.577 vinhos, união de duas fontes abertas. Não vem de
migration (grande demais): a migration cria a collection, o conteúdo entra por

```bash
# PocketBase precisa estar PARADO
node scripts/importar-catalogo.mjs catalogo.jsonl pb_data/data.db
```

Busca por substring sobre a coluna `search` (minúscula, sem acento): ~25 ms em
245 mil linhas. Licenças: a parte `we` é CC BY-NC-SA (**não comercial**), a
parte `rt` é CC BY 4.0. Se o Wine Circle virar produto pago, a parte `we` sai.

No CI e no ambiente local o catálogo cheio é inviável (245 mil linhas, direto no
SQLite, com o servidor parado). Ali entra o `semear-catalogo-teste.mjs`, que
carrega 50 vinhos pela API em menos de um segundo:

```bash
npm run pb:seed
```

O fixture (`test/fixtures/catalogo-teste.jsonl`) tem só dados factuais —
produtor, região, uva, safra. As notas de degustação dos datasets são a parte
com licença restritiva e não entram no repositório.

Isso não é cosmético: sem catálogo o autocomplete não devolve nada, e a falha
não aparecia onde nascia. O cenário 2 quebrava esperando uma sugestão, o
Playwright reiniciava o worker, o `beforeAll` rodava `resetDatabase()` de novo e
o teste seguinte perdia o `clubId` — o que se manifestava como falha no teste de
permissão de exclusão do clube, onde não havia falha nenhuma.

## Regras de acesso

Escrita em `pb_migrations/1786794204_lock_write_rules.js`; a leitura de
`wc_clubs` fechou depois, em `1786900000_convite_com_token.js`. O princípio:
**escrita é do dono, leitura é de quem participa.**

| Collection | Ler | Escrever |
|---|---|---|
| `wc_clubs` | dono e membros | só o dono |
| `wc_events` | membros do clube | quem criou |
| `wc_ratings` | membros do clube | só as próprias notas |
| `wc_expenses` | membros do clube | quem lançou |
| `wc_payments` | devedor e credor | devedor e credor (status); criação por quem lançou |
| `wc_push_subs` | o próprio | o próprio |
| `wc_profiles` | qualquer autenticado | view, somente leitura |

`wc_profiles` é uma view sobre `users` expondo apenas `id`, `display_name` e
`avatar_url`. A collection `users` continua fechada em `id = @request.auth.id`,
então e-mail e chave Pix não vazam. A chave chega a quem precisa por outro
caminho: o servidor copia a do credor para o registro de pagamento, que só
devedor e credor leem.

## Convite

O link é `/join/<id do clube>?t=<token>`. O token é `invite_token`, 24
caracteres gerados pelo `autogeneratePattern` do próprio schema.

Antes o link era só `/join/<id>`, e o id não era segredo: `wc_clubs` tinha
`listRule: "@request.auth.id != \"\""`, então qualquer conta listava todos os
clubes com seus ids, e `/api/wc/join` aceitava qualquer id sem perguntar de onde
ele veio. Entrar em todos os clubes da instância eram duas requisições — e ser
membro dá leitura de eventos, notas e despesas.

A regra estava aberta por um motivo real: a tela de convite precisa mostrar o
clube a quem ainda está de fora. Quem faz isso agora é `GET /api/wc/invite`, que
roda com privilégio, exige o token e devolve só nome, descrição e contagem —
nunca a lista de membros nem o próprio token. Não exige autenticação de
propósito: quem abre o link ainda não entrou, e o segredo é o token, não a
sessão.

A comparação é de tempo constante (`lib_convite.js`). Clube sem token é convite
inválido, nunca "qualquer um entra": o campo é opcional no schema, porque
adicionar coluna obrigatória a uma collection com registros existentes falharia.

Não há rotação pela interface ainda. Para invalidar os links de um clube, troque
o `invite_token` pelo painel de administração.

## Conhecido / pendente

- Cache do Cloudflare: o token disponível é só de analytics e não purga. O
  service worker é registrado como `/sw.js?v=N` (ver `SW_VERSION` em
  `app/src/App.tsx`) justamente por isso — **suba o número ao mexer em sw.js**.
- Push notifications não são cobertas por teste automatizado.
- Backup do `pb_data` ainda é manual.
