Plano de Implementação do Backend — PETBSI Scrum
Visão Geral
Projeto TypeScript/Next.js com Clean Architecture + DDD, banco Neon PostgreSQL. Zero código existe — tudo precisa ser criado. O backend abrange: domínio, casos de uso, repositórios, autenticação, integrações Google e rotas de API.
Stack Tecnológico
Camada	Tecnologia
Framework	Next.js 14+ (App Router, Server Actions)
Linguagem	TypeScript
Banco	PostgreSQL (Neon)
ORM/Driver	Prisma (recomendado — migration nativo, type-safe)
Auth	NextAuth.js / Auth.js (compatível com Google OAuth)
Testes	Vitest (unit/aplicação) + Prisma test database (integração)
Validação	Zod
IDs	crypto.randomUUID() (UUID v4 nativo)
Fases de Implementação (P0 → P1 → P2)
FASE 1 — Infraestrutura Base (BT-01 + BT-02)
Objetivo: Projeto funcional, banco criado, autenticação rodando.
1.1 Scaffolding do projeto
- package.json, tsconfig.json, next.config.ts, .env.example
- Instalar dependências: next, react, @prisma/client, prisma, next-auth, zod, vitest
- Configurar pasta src/ conforme tree.md
1.2 Schema Prisma + Migrações (db/)
Arquivo db/schema.prisma com 20 tabelas conforme 05-modelo-de-dados.md:
projects, product_goals, work_fronts, people, pairs,
project_memberships, sprints, sprint_items, backlog_items,
workflow_columns, work_item_state_changes, blockers,
deliveries, deadlines, attachments, notifications,
notification_recipients, calendar_events,
integration_connections, audit_events
- UUIDs como @id @default(uuid())
- FKs com @relation
- Índices conforme §5 do modelo de dados
- Seeds: 4 frentes iniciais, 8 pessoas placeholder
1.3 Validação de ambiente (src/server/env.ts)
- Variáveis: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_CALENDAR_ID
- Validação com Zod no startup
1.4 Conexão do banco (db/client.ts)
- Instância Prisma singleton para server-side
1.5 Autenticação (BT-01)
- src/server/authorization/require-session.ts — extrai sessão da request
- src/server/authorization/require-project-permission.ts — valida ProjectMembership + papel
- app/api/auth/[...nextauth]/route.ts — NextAuth com Google OAuth provider
- Tabela Person vinculada via auth_subject (sub do JWT)
FASE 2 — Camada de Domínio (BT-03)
Objetivo: Entidades puras, value objects, políticas — zero dependência de framework.
2.1 Value Objects (src/domain/shared/)
Arquivo	Conteúdo
project-role.ts	Enum: MEMBER, SCRUM_MASTER, COORDINATOR, PRODUCT_OWNER, STAKEHOLDER, TECHNICAL_ADMIN
work-item-status.ts	Enum: BACKLOG, SELECIONADO, PRONTO_PARA_INICIAR, EM_PROGRESSO, BLOQUEADO, EM_REVISAO, CONCLUIDO, ENTREGUE, CANCELADO
sync-status.ts	Enum: DISABLED, PENDING, SYNCED, FAILED, REVOKED
email-address.ts	Value object com validação regex
date-range.ts	Value object startsOn/endsOn com validação startsOn < endsOn
wip-limit.ts	Value object com allows(currentCount: number): boolean
external-file-reference.ts	Provedor, externalId, url, fileName, mimeType, sizeBytes
notification-status.ts	Enum: DRAFT, PENDING, SENDING, SENT, FAILED, CANCELLED
2.2 Entidades (src/domain/{bounded-context}/)
Bounded Context	Arquivos	Entidades
project/	project.ts, product-goal.ts, project-membership.ts	Project (root), ProductGoal, ProjectMembership
people/	person.ts, pair.ts	Person, Pair
backlog/	backlog-item.ts, sprint-item.ts, backlog-policy.ts	BacklogItem (root), SprintItem
sprint/	sprint.ts	Sprint (root)
workflow/	workflow-column.ts, work-item-state-change.ts, wip-policy.ts	WorkflowColumn, WorkItemStateChange
blocker/	blocker.ts	Blocker
delivery/	delivery.ts	Delivery (root)
integration/	attachment.ts, notification.ts, calendar-event.ts	Attachment, Notification (root), CalendarEvent (root)
Cada entidade com:
- Propriedades privadas + getters
- Métodos de negócio (ex: BacklogItem.moveTo(column), Sprint.selectItem(item), Blocker.resolve())
- Validação de invariantes dentro dos métodos
- Lançamento de erros de domínio (não HTTP)
2.3 Políticas
- backlog-policy.ts — regras de ordenação, seleção para Sprint
- wip-policy.ts — canMove(column, currentCount) → valida limite WIP
FASE 3 — Casos de Uso e Ports (BT-04)
Objetivo: Orquestração via contratos, sem implementação concreta ainda.
3.1 Ports — Repositories (src/application/ports/repositories.ts)
interface ProjectRepository { findById, save, ... }
interface SprintRepository { findById, findActiveByProject, save, ... }
interface BacklogItemRepository { findById, findByProject, findBySprint, save, ... }
interface DeliveryRepository { findById, findByProject, save, ... }
interface NotificationRepository { findById, save, ... }
interface CalendarEventRepository { findById, save, ... }
interface AuditPort { log(eventType, aggregateType, aggregateId, metadata) }
3.2 Ports — Gateways (src/application/ports/)
Arquivo	Interface
file-storage-gateway.ts	upload(file, folderId) → ExternalFileReference
email-gateway.ts	send(message) → DeliveryResult
calendar-gateway.ts	createOrUpdate(event) → ExternalEventReference
auth-gateway.ts	getCurrentUser(request) → AuthenticatedUser
3.3 Casos de uso (src/application/{context}/)
Arquivo	Responsabilidade
overview/get-project-overview.ts	Agrega Sprint, metas, bloqueios, WIP, entregas
backlog/create-backlog-item.ts	Cria item com validação de papel (PO)
backlog/move-backlog-item.ts	Move item entre colunas, valida WIP, registra histórico
sprint/manage-sprint.ts	Criar Sprint, selecionar itens, definir meta, iniciar/encerrar
attachments/upload-attachment.ts	Upload ao Drive com status pendente→concluído
notifications/send-notification.ts	Enviar Gmail com idempotência
calendar/sync-calendar-event.ts	Sincronizar evento com Calendar
Cada caso de uso:
- Recebe DTO de entrada tipado com Zod
- Valida autorização via authGateway.getCurrentUser()
- Chama repository + gateway por porta
- Retorna DTO de saída
- Emite eventos de auditoria via auditPort
FASE 4 — Repositories PostgreSQL (BT-02 continuação)
Objetivo: Implementação concreta dos repositories com Prisma.
4.1 Implementações (src/adapters/repositories/)
Arquivo	Tabelas usadas
project-repository.ts	projects, product_goals, work_fronts, project_memberships, people, pairs
backlog-repository.ts	backlog_items, sprint_items, work_item_state_changes, blockers
sprint-repository.ts	sprints, sprint_items
integration-repository.ts	attachments, notifications, notification_recipients, calendar_events
Cada repository:
- Converte Prisma models ↔ Domain entities
- Usa transações do Prisma para operações atômicas (ex: mover item = atualizar coluna + inserir histórico)
- Implementa consultas com índices otimizados
4.2 Transações críticas
- Movimentação de item: validar → contar WIP → atualizar backlog_item.column_id → inserir work_item_state_change → inserir audit_event — tudo em uma transação Prisma $transaction
- Upload Drive: criar attachment pendente → chamar gateway → atualizar status — retry-safe com idempotência
FASE 5 — Rotas de API / Server Actions
Objetivo: Boundary HTTP, converte request ↔ use case.
5.1 Estrutura (app/api/)
app/api/
├── auth/[...nextauth]/route.ts
├── backlog/
│   ├── route.ts            GET (listar) + POST (criar)
│   └── [itemId]/
│       ├── route.ts        GET (detalhes) + PATCH (editar)
│       └── move/route.ts   POST (movimentar)
├── sprints/
│   ├── route.ts            GET + POST
│   └── [sprintId]/
│       ├── route.ts        GET + PATCH
│       └── items/route.ts  GET + POST (selecionar item)
├── workflow/
│   └── columns/route.ts    GET (colunas com WIP)
├── attachments/
│   ├── route.ts            POST (upload)
│   └── [id]/route.ts       GET (status)
├── notifications/
│   └── route.ts            GET + POST
├── calendar/
│   └── events/route.ts     GET + POST
├── integrations/google/
│   ├── drive/route.ts      POST (upload)
│   ├── gmail/route.ts      POST (send)
│   └── calendar/route.ts   POST (sync)
└── overview/route.ts       GET (visão geral)
5.2 Middleware
- src/adapters/http/request-context.ts — extrai sessão, projeto, papel
- src/adapters/http/error-handler.ts — mapeia erros de domínio → HTTP status (400, 401, 403, 404, 409, 500)
FASE 6 — Integrações Google (P1: BT-06 + BT-07)
6.1 Google Drive (src/adapters/google/google-drive-gateway.ts)
- Usa googleapis SDK
- upload() → pasta autorizada (folder_id do .env)
- Retorna ExternalFileReference sem expor token
- Retry com backoff exponencial
6.2 Gmail (src/adapters/google/gmail-gateway.ts)
- Escopo de envio somente
- Valida destinatários antes de enviar
- Registra provider_message_id para auditoria
6.3 Token Store (src/server/integrations/token-store.ts)
- Armazena tokens em vault seguro ou variável encriptada
- Nunca em texto puro em tabelas de domínio
FASE 7 — Auditoria e Observabilidade (BT-09)
- Tabela audit_events populada em toda escrita relevante
- AuditPort implementado com audit_events table
- Logs estruturados (sem tokens/credenciais)
- Correlation ID por request
FASE 8 — Testes (BT-10)
Camada	Tipo	Ferramenta	Quantidade
Domain	Unitário	Vitest	~12 testes (D01-D12)
Application	Unitário com fakes	Vitest	~12 testes (A01-A12)
Adapters	Integração	Vitest + Prisma test DB	Repositories, Gateways
API	Integração	Vitest + supertest/MSW	Rotas HTTP
E2E	Fluxo completo	Playwright (futuro)	8 cenários prioritários
Ordem de Implementação Recomendada
Sprint 1: FASE 1 (scaffolding, Prisma, auth) + FASE 2 (domínio completo)
Sprint 2: FASE 3 (ports + use cases) + FASE 4 (repositories)
Sprint 3: FASE 5 (rotas API) + testes unitários/domínio
Sprint 4: FASE 6 (Google integrations) + FASE 7 (auditoria) + testes integração
Sprint 5: FASE 8 (E2E) + frontend (além do escopo deste plano backend)
Decisões que Precisam Ser Tomadas
1. ORM: Prisma é a recomendação — migrations nativas, type-safe, bom DX. Confirmar?
2. Auth provider: NextAuth com Google OAuth. Outra opção?
3. Test runner: Vitest vs Jest? (Vitest é mais rápido e nativo ESM)
4. Arquivo de schema único vs módulos Prisma: Para 20 tabelas, recomendo schema único com prisma migrate
5. Server Actions vs API Routes: Para mutations do frontend, Server Actions simplificam. Usar ambos?
6. ** fila para operações Google**: BullMQ/Redis ou processamento síncrono com retry? Para MVP, síncrono com retry é suficiente.
Deseja que eu comece pela Fase 1 (scaffolding + Prisma + auth) ou prefere ajustar algo no plano antes?