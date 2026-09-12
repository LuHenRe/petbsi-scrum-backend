# 05 — Revisão do código (Hardening): problemáticas

> Dia: 10/09. Escopo: revisão completa de domínio, aplicação, ports, schema, testes e
> infraestrutura, realizada após a Fase de validação (04). Nenhuma correção foi executada
> ainda — este log registra apenas o diagnóstico. O plano de correções está em
> `docs/logs/06-plano-correcoes-hardening.md`.

## A. Domínio (críticas)

1. **Sprint sem ciclo de vida completo (beco sem saída)** — `Sprint.create` só produz
   `DRAFT` e não há método de promoção para `PLANNING`/`PLANNED`/`REVIEW`/`RETROSPECTIVE`.
   `canStart()` exige `PLANNED` e `canClose()` exige `REVIEW`/`RETROSPECTIVE`
   (`src/domain/shared/sprint-status.ts:34-48`), logo `start()`/`close()` são inalcançáveis
   no fluxo real (`src/domain/sprint/sprint.ts:98-149`). O teste só passa porque constrói
   `PLANNED` na mão (`tests/unit/sprint.test.ts`).
2. **Guards órfãos** — `BacklogPolicy.canAddToSprint/canReorder`, 
   `Notification.validateRecipients/canRetry` e `Project.hasActiveProductOwner` existem mas
   nunca são chamados pelo fluxo real; um item terminal (`ENTREGUE`/`CANCELADO`) pode entrar
   na Sprint (`src/application/sprint/plan-sprint.ts:119-130`, `src/domain/sprint/sprint.ts:72-86`).
3. **`WipLimit` contraditório** — `allows(0)` retorna ilimitado e `isAtCapacity(0)` retorna
   cheio (`src/domain/shared/wip-limit.ts:14-21`, `src/domain/workflow/wip-policy.ts:16-26`).
4. **Blocker/status inconsistentes** — dá para sair de `BLOQUEADO` com blocker aberto;
   `registerBlocker` não define status `BLOQUEADO`
   (`src/domain/backlog/backlog-item.ts:164-198`); `manage-blocker.ts:62-67` engole o
   `InvalidTransitionError` num try/catch.
5. **`Notification` sem máquina de estados** — `confirmSend` sobrescreve status e
   `idempotencyKey` de qualquer estado; `markSent/markFailed/cancel` sem guardas
   (`src/domain/integration/notification.ts:129-152`); `canRetry` está morta; o use case usa
   `EmailAddress.unsafeCreate` (`src/application/notifications/send-notification.ts:82-86`).
6. **Falha de ownership nos agregados** — `Project` aceita `ProductGoal`/`WorkFront`/
   `ProjectMembership` de outro projectId e permite 2º `PRODUCT_OWNER` ativo
   (`src/domain/project/project.ts:68-110`); `BacklogItem.create` aceita `frontId`/`columnId`
   de outro projeto (`src/application/backlog/manage-backlog.ts:60-68`); métodos `load*`
   não validam o id do agregado pai.
7. **`moveTo` usa `crypto.randomUUID()` global** (`src/domain/backlog/backlog-item.ts:148-156`)
   — quebra em Node <19 e gera id dentro do domínio (impede idempotência do repositório).
8. **Status × coluna podem divergir** — `transitionTo` muda só o status e `moveTo` só a
   coluna; `changedBy` é recebido e descartado, sem registro de histórico de mudança de status
   (`src/domain/backlog/backlog-item.ts:134-180`).
9. **Decisões de modelagem frágeis** — `ProjectMembership.isValid` × `isExpired` se
   contradizem e sem validação de papel/data (`src/domain/project/project-membership.ts:71-88`);
   `Sprint.removeItem` deixa `orderIndex` duplicado (`src/domain/sprint/sprint.ts:88-96`);
   mutações de Sprint sem guarda de status (`cancel()` sobrescreve terminal);
   `Pair` sem composição de pessoas (dupla não validável); status como string livre em
   Project/ProductGoal/Blocker/Delivery/Attachment; `CalendarEvent` mantém `syncStatus =
   SYNCED` obsoleto após edição local (`src/domain/integration/calendar-event.ts:95-99`).

## B. Aplicação

1. **Retry de upload impossível no schema** — `Attachment.createPending` grava
   `externalFileId: ""` (`src/domain/integration/attachment.ts:51-70`), e a tabela
   `attachments` tem `@@unique([provider, externalFileId])`
   (`prisma/schema.prisma:322`) → 2ª tentativa viola a constraint; sem chave de idempotência
   no input (`src/application/attachments/upload-attachment.ts`).
2. **`overrideWip` liberado para qualquer MEMBER** — sem "autorização explícita"
   (`src/application/backlog/move-backlog-item.ts:32-60`).
3. **`SendNotification`** — reusar a idempotencyKey após falha retorna o `FAILED` antigo sem
   reenviar (`src/application/notifications/send-notification.ts:59-69`); validação de
   destinatário roda antes do short-circuit de idempotência; o ramo `throw` do gateway não
   audita `NOTIFICATION_FAILED` (auditoria inconsistente).
4. **"Projeto arquivado"** só é checado em 1 caso de uso
   (`src/application/backlog/manage-backlog.ts:55-57`); ausente nos outros 10 com escrita.
5. **`PlanSprint.close()` faz no-op silencioso** quando `canClose()` é falso e retorna
   sucesso (`src/application/sprint/plan-sprint.ts:200-211`); sem teste.
6. **UC08 sem precondições** — não verifica conexão Drive ativa nem resolve `folderId`
   (`src/application/attachments/upload-attachment.ts:54`); `findByProjectAndProvider`
   existe mas é não usado.
7. **`recentDeliveries` ordenado mais antigo → mais novo** (`src/application/overview/get-project-overview.ts:132-138`).
8. **Barreis incompletos** — `src/application/index.ts` omite `UpdateSprintInput`,
   `SelectItemToSprintInput`, `RemoveItemFromSprintInput`; `src/application/ports/index.ts`
   só exporta `ExternalFileReference`.
9. **Resolução de papel não determinística** — `require-project-permission.ts:24-31` usa
   `findFirst` sem `orderBy` e ignora `startsOn`; o helper não implementa a interface
   `AuthGateway`.

## C. Ports × schema (bloqueiam a Fase 4)

1. **`BacklogItemRepository.save`** precisa persistir `work_item_state_changes` append-only
   sem contrato de diff — reinsert duplica, delete+insert viola FK `onDelete: Restrict`
   (`src/application/ports/repositories.ts:30`).
2. **`findByIdConcurrent`** promete lock otimista, mas não há campo de versão no domínio nem
   no schema (`src/application/ports/repositories.ts:26`).
3. **`findBySprint`** retorna `[]` sempre no fake (mente) e nunca é usado
   (`tests/application/fakes/fake-repositories.ts:150-152`).
4. **Finders ausentes** p/ telas futuras: `Attachment`/`Notification`/
   `IntegrationConnection` (findByProject), `Sprint` (findByProject);
   `NotificationRecipient.deliveryStatus` nada preenche (`prisma/schema.prisma:349-360`).

## D. Testes (lacunas)

- A08 "retry" não testa a mesma operação (recria attachment) e não inspeciona as linhas do
  repositório; faltam cenários "arquivo inválido" e "pasta ausente".
- A09 sem "destinatários vazios", sem retry pós-falha e sem o ramo de `throw` do gateway.
- A04 sem testes de `start()`/`close()`; A02 sem "projeto não encontrado"; A07 sem
  paginação e sem asserção de ordenação; A12 sem reconectar pós-revogação.

## E. Infra (próximas fases)

- `.env` ausente (Neon, NextAuth, OAuth Google) — só existe `.env.example`.
- Rota `/login` não existe (`src/server/auth-options.ts:29`, `app/page.tsx:10`).
- Migrations e seeds não criados (`db/` só tem `client.ts`; `db:seed` aponta para
  `db/seeds/index.ts` inexistente no `package.json:13`).
- ESLint não instalado (`npm run lint` = `next lint` quebra; sem `.eslintrc`).
- `next build` nunca validado; `next-env.d.ts` não gerado.

## Situação de verificação

- `npm run typecheck` limpo; `vitest run` 107/107 passando (20 arquivos) antes desta revisão.
- A revisão não alterou código — apenas diagnóstico.