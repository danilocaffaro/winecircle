# Wine Circle — backlog

Fonte: [Wine Circle: revisão de UX, convite e riscos](https://claude.ai/code/artifact/c7ceafe7-44a1-4840-b0f6-4065fea65e2f), de 29/09/2026, confrontada com o código e uma instância isolada de PocketBase 0.36.8.

## Primeira entrega — convite e integridade

Implementada na branch `codex/winecircle-backlog`. Aplicação em produção ainda pendente de aprovação: inclui a **nova** migration `1790726400_tasting_integrity.js`. Nenhuma migration anterior foi editada e nenhum dado real foi alterado.

| Achado do documento | Entrega |
|---|---|
| 1. Destino perdido após cadastro/login | Destino compartilhado entre guard e formulário, persistido por sessão; cadastro/login dentro do convite e entrada automática no clube |
| 2–3. Resultado antecipado e votos editáveis após encerrar | Guard nas telas e bloqueio no servidor; votos só podem ser escritos pelo endpoint transacional enquanto `tasting` |
| 4. Tokens inexistentes no WineCard | Tokens corrigidos; verify rejeita variáveis CSS sem definição |
| 5. Envio fora da primeira tela | Overflow corrigido e ações fixas durante a rolagem; teste de posição no viewport |
| 6. Falha de rede confundida com vazio/convite inválido | Erro persistente e tentativa de novo em convite, painel e clubes |
| 7. Controles de organização exibidos a participantes | Iniciar/editar só para organizador; organizador sem voto ainda pode encerrar |
| 8–9. Rótulos/idioma/versões inconsistentes | Rótulo cego estável, telas centrais em português e remoção de versões fictícias |
| 10. Ausente impede encerrar | Encerramento parcial com confirmação e nomes pendentes; encerramento sem votos tem saída válida |
| 11–12. Envio parcial e mudanças nos índices durante votação | Ranking completo em uma transação; vinhos, tipo e participantes fixos após começar |
| 13. Empate arbitrário | Pontos + primeiros lugares empatados compartilham colocação e aparecem como empate na revelação |
| 14–15. Ícone push inexistente e vínculo após logout | Assets versionados; cancelamento no aparelho e remoção da inscrição da conta; controle de reativação no perfil |
| 16–17. Mutação de estado e dependências ociosas | Ordenação de cópia dos eventos; remoção de generative-ai e uuid |

Também incluídos:

- Gabarito cego omitido no payload e bloqueado em filtros/sort por campo hidden, inclusive filtros por relações.
- Progresso do grupo sem expor votos; revelação atualizada por realtime/polling e respostas antigas ignoradas ao sair da tela.
- Rascunho de ordem/notas preservado antes do primeiro envio e durante revisões.
- Pagamentos com valores/pessoas imutáveis; devedor marca pago, credor confirma ou contesta; timestamps vêm do servidor.
- Atualizações de evento/pagamento relidas dentro da transação, preservando estados concorrentes.
- Entrada/saída de clube transacional, sem perder membros em entradas simultâneas.
- Fonte de ícones usada pelo app reduzida de 5,25 MB para aproximadamente 44 KB, preservando aliases e ligaturas. Fonte original permanece em `app/resources/` para regeneração.
- Mesma verificação no hook local e CI; deploy manual exige os checks `build` e `e2e`, com nome próprio `deploy-build` para evitar colisão.

## Próximas entregas

| Prioridade | Item | Critério de conclusão |
|---|---|---|
| P1 | Gestão de clube: sair/remover membro e rotacionar convite na interface | Permissões e eventos em andamento preservados; link antigo deixa de funcionar após rotação |
| P1 | Fila push persistente e segura | Sem reescrita concorrente do JSONL nem exposição de endpoints/chaves em `/tmp`; consumo com retry/idempotência |
| P1 | Rateio em centavos, pagador explícito e Pix copia e cola/QR | Soma exata dos valores e fluxos de cobrança/contestação comprovados |
| P1 | Busca opcional por IA | Limites por conta, origem/validação das fichas e falhas controladas; conferir configuração real antes de prometer disponibilidade |
| P1 | Conta: recuperar acesso, excluir/exportar dados e privacidade | Fluxos reais de e-mail e consequências sobre clubes/eventos definidos e testados |
| P1 | Validação física no iPhone/Android | Convite recebido por WhatsApp, teclado, drag, instalação, retomada e push no aparelho |
| P2 | Convite para membro existente e convite após criar clube | Mensagem explícita de já membro e compartilhamento acessível |
| P2 | Progresso compacto e notas com descritores | Ranking continua visível em telas estreitas; notas opcionais sem atrito |
| P2 | Compartilhar resultado como imagem | Empates, resultados parciais e identidade do clube preservados |
| P2 | Push para convite/início/encerramento e revelação sincronizada | Preferências por conta e sincronização entre aparelhos, sem votos antecipados |
| P2 | Randomização protegida, histórico do clube e RSVP/calendário | Gabarito estável e protegido; histórico/participação úteis para organizar o próximo encontro |
| P2 | Acesso por código de e-mail | SMTP disponível, rate limits e recuperação definidos |
| P2 | Cache offline, tipografia local, temas e acessibilidade | Assets essenciais disponíveis; dados desatualizados sinalizados e foco/contraste/touch conferidos |
| P2 | Consultas agregadas e subscriptions por contexto | Reduzir buscas em cascata no painel/histórico e medir requisições/latência com clubes grandes |
| P3 | Leitura de rótulo pela câmera | Avaliação de precisão/custo e confirmação humana antes de inserir o vinho |

## Verificação e operação

`npm run verify` faz lint, typecheck, build, sintaxe/presença do service worker, ausência de padrão de chave de API, orçamento de fontes e tokens CSS. `npm run test:e2e` inclui os cenários anteriores e as regressões de `08-backlog-integridade.spec.mjs`, com backend real local e navegador em viewports mobile/desktop.

Execução no Mac16 em 29/09/2026: `verify` aprovado e **166/166 testes E2E aprovados**, sem retries (83 cenários em cada viewport). A instância isolada usou dados sintéticos e todas as migrations, incluindo a nova.

A regressão de resposta atrasada foi repetida cinco vezes em cada viewport após proteger também o intervalo entre a mudança da URL e o cleanup do React: **10/10 aprovadas sem retries**.

Push no sistema operacional e comportamento físico do iPhone/Android continuam pendentes: o teste de logout simula somente a inscrição do navegador e usa a API local real para sua remoção. A execução automatizada em viewport não substitui aparelho físico.

O checkpoint do Orca não pôde ser atualizado porque o runtime do app não estava disponível no Mac16. A branch/worktree e este documento preservam o estado para revisão. O deploy permanece manual e depende de secrets e de aprovação para a migration nova; ver [DEPLOY-NOTES.md](DEPLOY-NOTES.md).
