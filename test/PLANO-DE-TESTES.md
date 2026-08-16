# Plano de testes — Wine Circle

Os testes são organizados por **cenário de uso**, não por arquivo de código: cada
um percorre uma jornada que uma pessoa de verdade faz, do começo ao fim, com um
contexto de navegador por participante.

## Por que assim

A suíte anterior (`e2e-full.mjs`, 848 linhas) reportava **16/16, 0 falhas** com o
produto quebrado. Três motivos, que este plano corrige de frente:

| Problema de antes | O que mudou |
|---|---|
| Todo passo era `if (btn) { click; pass() }` — botão ausente não falhava, só não registrava nada | Toda asserção é sobre estado observável: texto na tela, URL, registro no banco |
| O drag-and-drop do ranking era pulado ("DnD is hard to automate reliably") — o gesto central do app nunca foi exercitado | O ranking tem botões de subir/descer (que também resolvem acessibilidade) e são exercitados em todos os cenários |
| Rodava contra **produção**, criando usuários reais a cada execução | `test/helpers.mjs` recusa qualquer URL que não seja local, e cada cenário zera o banco antes de começar |

## Como rodar

Três terminais, ou três comandos em background:

```bash
npm run pb:test
```

```bash
npm run dev
```

```bash
npm run test:e2e
```

O primeiro sobe um PocketBase local na porta 8091 aplicando as mesmas migrations
e hooks de produção. O segundo sobe o app na 5174, que sem
`VITE_POCKETBASE_URL` aponta para ele por padrão. O terceiro roda os cenários em
Pixel 7 e Desktop Chrome.

Para zerar o banco de teste do zero:

```bash
npm run pb:test:reset
```

Na primeira vez é preciso criar o superusuário local:

```bash
cd test/pb && ./pocketbase superuser upsert test@local.dev "TesteLocal2026!" --dir=./pb_data
```

## Os cenários

### 1 — Primeiro acesso (`01-onboarding.spec.mjs`)

Alguém que nunca usou o app.

- Visitante vê a apresentação, e rota interna manda para o login em vez de
  mostrar listas vazias *(A-18)*
- Criar conta leva a um painel que **admite** estar vazio e oferece a próxima ação
- Senha errada produz uma mensagem legível, não um erro silencioso no console

### 2 — Clube e convite (`02-clube-convite.spec.mjs`)

Carlos monta o grupo, Marina entra pelo link.

- Dono cria o clube e se vê na lista de membros
- Marina entra pelo `/join/:id` e o backend confirma os dois no clube
- **Os dois se enxergam** — antes a lista mostrava "Members (1)" com o clube
  cheio, porque `users` só deixava você ler o próprio registro *(A-13)*
- Marina **não consegue apagar** o clube de Carlos, testado direto na API e não
  pela ausência do botão *(A-12)*

### 3 — Degustação às cegas (`03-degustacao.spec.mjs`)

O coração do produto: três pessoas, três dispositivos, quatro vinhos.

- O evento nasce com os participantes gravados *(A-03)*
- A tela abre em `0/3`, não em "todos enviaram" com ninguém *(A-09)*
- Em modo cego o nome do vinho não vaza
- **O rótulo cego não muda quando você reordena** — antes o vinho A virava B ao
  arrastar, e as duas telas discordavam sobre qual era qual *(A-16)*
- Cada pessoa envia o próprio ranking, em contexto isolado; o resultado é uma
  linha por (pessoa, vinho) e ninguém sobrescreve ninguém *(A-10, A-15)*
- Reenviar **atualiza** em vez de duplicar, garantido pelo índice único *(A-08)*
- Quem não é do clube é barrado pelo backend, e a tela explica o porquê
- Com todos prontos, quem organiza revela e o evento chega a `completed` *(A-04)*

### 4 — Resultado e conta (`04-resultado-conta.spec.mjs`)

A revelação e o acerto.

- A contagem de Borda elege o vencedor certo, com pontuação conferida à mão no
  próprio teste
- A tabela "voto a voto" mostra o nome de cada participante
- Evento sem votos **não inventa vencedor** — antes revelava o primeiro vinho da
  lista com 0 pontos, com pódio e animação *(A-20)*
- O rateio é calculado e persiste
- Recalcular **não duplica** despesa nem pagamentos *(A-08)*
- **Pedro abre o link numa sessão nova e ainda vê a dívida**, com a chave Pix de
  quem vai receber e o botão de pagar — o cenário que dava nome ao screenshot
  `pedro-sees-debt` e mostrava R$0,00 *(A-07)*
- Pedro marca como pago, Marina confirma, e o registro chega a `confirmed`
- Quem não lançou a conta não consegue editá-la

### 5 — Perfil e painel (`05-perfil.spec.mjs`)

A tela que mais mentia.

- As estatísticas refletem dados reais — antes vinham de um localStorage que
  ninguém escrevia desde a migração, e ficavam em zero para sempre *(A-06)*
- Conquistas acompanham o que aconteceu de fato
- O histórico linka para `/events/:id` — a rota antiga `/event/:clubId/:id` não
  existia no router
- A coleção de vinhos mostra só o que **você** provou, e quem não votou vê um
  vazio explicado
- A chave Pix salva e sobrevive a um reload
- A Home vira painel para quem entrou, com a degustação em andamento em primeiro
  lugar e a data correta *(A-17)*
- Sair da conta devolve à apresentação e volta a proteger as rotas internas

## Convenções

**Asserções.** Toda expectativa é sobre algo que a pessoa vê ou que o banco
registra. Nada de `expect(true)`, nada de "passou porque não explodiu".

**Seletores.** `data-testid` para controles que o teste opera, papéis ARIA para
o que deve ser acessível. Se um seletor por papel falha, geralmente é um bug de
acessibilidade, não do teste — foi assim que apareceu a falta de rótulo nos
campos do formulário de clube.

**Isolamento.** `newPersonContext()` dá a cada participante um contexto próprio
de navegador. Duas pessoas nunca compartilham sessão, que é justamente o que a
suíte antiga fazia ao simular a degustação num aparelho só.

**Dados.** O `beforeAll` de cada cenário zera as collections e monta o estado
pela API. A jornada pela UI é testada onde ela é o objeto do teste; onde é só
preparação, a API é mais rápida e mais estável.

## O que ainda não é coberto

Vale saber onde a rede tem furo:

- **Push notifications.** Exigem service worker e um endpoint de push real. O
  hook e o daemon foram corrigidos, mas o caminho ponta a ponta é verificado
  manualmente.
- **Busca de vinhos por IA.** Depende do Gemini; um teste real gastaria cota e
  seria não-determinístico. O proxy é verificado por contrato (autenticação
  exigida, erro tratado), não pela qualidade da resposta.
- **Realtime.** As telas assinam mudanças via WebSocket, mas os cenários
  verificam o estado após recarregar. Testar a atualização ao vivo entre dois
  contextos é possível e está pendente.
- **Fuso horário.** `formatEventDate` corrige o deslocamento de um dia, mas os
  testes rodam no fuso da máquina. Fixar `TZ` em vários valores no CI pegaria
  regressões que hoje passam.
