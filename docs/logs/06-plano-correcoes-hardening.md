# 06 — Plano de correções (Hardening)

> Dia: 10/09. Plano aprovado para as correções levantadas em
> `docs/logs/05-revisao-hardening.md`, considerando o restante da implementação do backend
> conforme `docs/plano-de-implementacao-do-backend.md`. Decisiones: D1–D4.

## Decisões aprovadas

- **D1 — Banco:** PostgreSQL real no Neon. `DATABASE_URL` para migrações/aplicação e
  `DATABASE_URL_TEST` para testes de integração.
- **D2 — Ordem:** corrigir o hardening (Etapa 0) antes de criar os adapters, para não assar
  bugs no schema/ports.
- **D3 — Attachment:** `externalFileId` nullable + nova coluna `idempotencyKey` unique,
  substituindo `@@unique([provider, externalFileId])` por índice não-único; retries não
  colidem e `PENDING`/`FAILED` duplicados ficam permitidos.
- **D4 — Escopo:** backend até a Fase 8 do plano original; frontend e E2E Playwright fora.

## Etapa 0 — Hardening do domínio e aplicação

0a. **Sprint lifecycle** — promoção `DRAFT → PLANNING → PLANNED`, `beginReview()`/
     `beginRetrospective()`, guardas em todas as transições, `close()` falha em vez de no-op;
     testes novos. (`sprint.ts`, `sprint-status.ts`, `plan-sprint.ts`)
0b. **Ligar guards órfãos** — `BacklogPolicy.canAddToSprint/canReorder`,
     `Notification.validateRecipients/canRetry` e `Project.hasActiveProductOwner` nos fluxos
     reais; rejeitar item terminal (`ENTREGUE`/`CANCELADO`) na Sprint.
0c. **WipLimit + Blocker/status** — unificar semântica do zero (0 = cheio/desabilitado);
     `registerBlocker` define `BLOQUEADO`; proibir sair de `BLOQUEADO` com blocker aberto;
     remover o try/catch que engole `InvalidTransitionError` em `manage-blocker.ts`.
0d. **Notification** — guardas de transição (`confirmSend` preserva status já enviado),
     `EmailAddress.create` no use case (sem `unsafeCreate`), transição `FAILED → PENDING`
     real via `canRetry`/`retryToPending`.
0e. **Ownership nos agregados** — validar `projectId` dos filhos em `Project`
     (`ProductGoal`/`WorkFront`/`ProjectMembership`), `frontId`/`columnId` em
     `BacklogItem.create`; validar ownership em todos os `load*`; id injetado pelo caller em
     `moveTo` (Node-safe, sem `crypto.randomUUID` no domínio).
0f. **Schema/concorrência** — aplicar D3 (`Attachment`); resolver `findByIdConcurrent`
     (campo `version` numerado OU remoção do contrato — confirmar na execução); revisar
     `BacklogItemRepository.save` p/ histórico idempotente por id.
0g. **Use cases** — checar "projeto arquivado" em todos os UC com escrita; restringir
     `overrideWip` a autorização explícita; idempotência/auditoria do UC09
     (branch `throw` audita `NOTIFICATION_FAILED`); precondições do UC08 (conexão Drive
     ativa + `folderId` no servidor); completar barrels (`application/index.ts` e
     `ports/index.ts`).
0h. **Regressão e registro** — `vitest run` verde + `tsc --noEmit` limpo + testes novos;
     ao concluir, atualizar este log com o resultado.

## Etapa 1 — Fechar a Fase 1

- `.env` com credenciais Neon/OAuth; `npx prisma migrate dev` no Neon.
- Seeds `db/seeds/index.ts` (4 frentes iniciais, 8 pessoas placeholder) + script.
- Rota `/login` mínima (NextAuth); **upsert de `Person`** vinculado via `auth_subject` no login.
- Instalar ESLint (`eslint`/`eslint-config-next`) + config para destravar `npm run lint`.
- Validar `next build`.

## Etapa 2 — Fase 4: Repositories PostgreSQL (adapters Prisma)

- `src/adapters/repositories/`: project, backlog (backlog_items, sprint_items,
  state_changes, blockers), sprint, integration (attachments, notifications,
  notification_recipients, calendar_events) + mappers.
- Transações críticas em `$transaction`: mover item (WIP → coluna → histórico → auditoria);
  upload retry-safe com idempotência (D3).
- Implementar `AuthGateway` concreto ligado ao NextAuth/`require-project-permission`.

## Etapa 3 — Fase 5: Rotas de API / Server Actions

- `src/adapters/http/request-context.ts` + `error-handler.ts` (400/401/403/404/409/500).
- Rotas: `overview`, `backlog` (+`move`), `sprints` (+`items`), `workflow/columns`,
  `attachments`, `notifications`, `calendar/events`, `integrations/google/*`.

## Etapa 4 — Fase 6: Integrações Google

- Instalar `googleapis`; gateways Drive/Gmail/Calendar com retry + backoff exponencial;
  escopo de envio somente (sem ler inbox); `token-store` via env no MVP.
- Pré-checagem de `IntegrationConnection` ativa antes de chamar gateway (UC08/UC09/UC11).

## Etapa 5 — Fase 7: Auditoria e observabilidade

- `AuditPort` com tabela `audit_events`; registrar branch `NOTIFICATION_FAILED`; logs
  estruturados sem credenciais; correlation ID por request.

## Etapa 6 — Fase 8: Testes de integração e API

- Test DB no Neon (`DATABASE_URL_TEST`); testes de repositórios e gateways controlados.
- Supertest para rotas HTTP; cobrir lacunas A04/A08/A09/A12 levantadas na revisão;
  regressão completa (domínio + aplicação).

## Etapa 7 — Finalização

- Lint + typecheck + `vitest run` + `next build` verdes.
- Logs `docs/logs/07-…0N.md` por etapa executada; limpar pasta vazia obsoleta
  `docs/plano-de-implementacao-do-backend/`.

## Pendências abertas para execução

- Provisionar o banco no Neon e preencher `.env` (bloqueia migrations e testes de integração).
- **Decidido (10/09):** `findByIdConcurrent` será resolvido com **versão numerada** (campo
  `version` int incrementado no update; `save` falha se a versão divergir — lock otimista).
  Formato do `version` a definir na Etapa 0f.

> Estado em 10/09: Etapa 0a–0d concluídas (vitest 125/125, `tsc --noEmit` limpo).
> 0e–0h pendentes — retomar na próxima sessão.