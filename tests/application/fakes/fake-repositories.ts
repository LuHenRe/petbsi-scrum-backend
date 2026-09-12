import { Project } from "@/domain/project/project"
import { Sprint } from "@/domain/sprint/sprint"
import { BacklogItem } from "@/domain/backlog/backlog-item"
import { WorkflowColumn } from "@/domain/workflow/workflow-column"
import { Delivery } from "@/domain/delivery/delivery"
import { Notification } from "@/domain/integration/notification"
import { CalendarEvent } from "@/domain/integration/calendar-event"
import { Attachment } from "@/domain/integration/attachment"
import { Blocker } from "@/domain/blocker/blocker"
import { UnauthorizedError } from "@/domain/shared/errors"
import { AuthGateway, AuthenticatedUser, ProjectRoleContext } from "@/application/ports/auth-gateway"
import {
  ProjectRepository,
  SprintRepository,
  BacklogItemRepository,
  WorkflowColumnRepository,
  DeliveryRepository,
  NotificationRepository,
  CalendarEventRepository,
  IntegrationConnectionRepository,
  IntegrationConnectionRow,
  AttachmentRepository,
  AuditEventRecord,
  AuditPort,
} from "@/application/ports/repositories"

export class FakeAuthGateway implements AuthGateway {
  currentUser: AuthenticatedUser = {
    personId: "person-1",
    email: "user@example.com",
    displayName: "Usuário Teste",
  }

  forceSessionError = false

  private memberships = new Map<string, { personId: string; role: string }[]>()

  addMembership(projectId: string, personId: string, role: string): void {
    const list = this.memberships.get(projectId) ?? []
    list.push({ personId, role })
    this.memberships.set(projectId, list)
  }

  async getCurrentUser(): Promise<AuthenticatedUser> {
    if (this.forceSessionError) {
      throw new Error("Sessão expirada")
    }
    return this.currentUser
  }

  async requireProjectPermission(
    projectId: string,
    allowedRoles?: string[]
  ): Promise<ProjectRoleContext> {
    const membership = (this.memberships.get(projectId) ?? []).find(
      (m) => m.personId === this.currentUser.personId
    )
    if (!membership) {
      throw new UnauthorizedError(
        `Usuário sem vínculo com o projeto "${projectId}"`
      )
    }
    if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new UnauthorizedError(
        `Papel "${membership.role}" sem permissão para esta operação`
      )
    }
    return {
      user: { ...this.currentUser },
      projectId,
      role: membership.role,
    }
  }
}

export class FakeProjectRepository implements ProjectRepository {
  projects: Project[] = []
  membershipsByProject = new Map<string, { personId: string; role: string }[]>()

  addMembership(projectId: string, personId: string, role: string): void {
    const list = this.membershipsByProject.get(projectId) ?? []
    list.push({ personId, role })
    this.membershipsByProject.set(projectId, list)
  }

  async findById(id: string): Promise<Project | null> {
    return this.projects.find((p) => p.id === id) ?? null
  }

  async findProjectIdsByPerson(personId: string): Promise<string[]> {
    const ids: string[] = []
    for (const [projectId, list] of this.membershipsByProject) {
      if (list.some((m) => m.personId === personId)) ids.push(projectId)
    }
    return ids
  }

  async save(project: Project): Promise<void> {
    const idx = this.projects.findIndex((p) => p.id === project.id)
    if (idx >= 0) this.projects[idx] = project
    else this.projects.push(project)
  }
}

export class FakeSprintRepository implements SprintRepository {
  sprints: Sprint[] = []

  async findById(id: string): Promise<Sprint | null> {
    return this.sprints.find((s) => s.id === id) ?? null
  }

  async findActiveByProject(projectId: string): Promise<Sprint | null> {
    return (
      this.sprints.find(
        (s) => s.projectId === projectId && s.isActive()
      ) ?? null
    )
  }

  async findCurrentByProject(projectId: string): Promise<Sprint | null> {
    return (
      this.sprints.find(
        (s) => s.projectId === projectId && s.isActive()
      ) ?? this.sprints.find((s) => s.projectId === projectId && s.status.is("PLANNED")) ?? null
    )
  }

  async save(sprint: Sprint): Promise<void> {
    const idx = this.sprints.findIndex((s) => s.id === sprint.id)
    if (idx >= 0) this.sprints[idx] = sprint
    else this.sprints.push(sprint)
  }
}

export class FakeBacklogItemRepository implements BacklogItemRepository {
  items: BacklogItem[] = []

  async findById(id: string): Promise<BacklogItem | null> {
    return this.items.find((i) => i.id === id) ?? null
  }

  async findByIdConcurrent(id: string): Promise<BacklogItem | null> {
    return this.findById(id)
  }

  async findByProject(projectId: string): Promise<BacklogItem[]> {
    return this.items.filter((i) => i.projectId === projectId)
  }

  async findBySprint(): Promise<BacklogItem[]> {
    return []
  }

  async findByColumn(columnId: string): Promise<BacklogItem[]> {
    return this.items.filter((i) => i.columnId === columnId)
  }

  async countByColumn(columnId: string): Promise<number> {
    return this.items.filter((i) => i.columnId === columnId).length
  }

  async save(item: BacklogItem): Promise<void> {
    const idx = this.items.findIndex((i) => i.id === item.id)
    if (idx >= 0) this.items[idx] = item
    else this.items.push(item)
  }
}

export class FakeWorkflowColumnRepository implements WorkflowColumnRepository {
  columns: WorkflowColumn[] = []

  async findById(id: string): Promise<WorkflowColumn | null> {
    return this.columns.find((c) => c.id === id) ?? null
  }

  async findByProject(projectId: string): Promise<WorkflowColumn[]> {
    return this.columns.filter((c) => c.projectId === projectId)
  }

  async save(column: WorkflowColumn): Promise<void> {
    const idx = this.columns.findIndex((c) => c.id === column.id)
    if (idx >= 0) this.columns[idx] = column
    else this.columns.push(column)
  }
}

export class FakeDeliveryRepository implements DeliveryRepository {
  deliveries: Delivery[] = []

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.find((d) => d.id === id) ?? null
  }

  async findByProject(projectId: string): Promise<Delivery[]> {
    return this.deliveries.filter((d) => d.projectId === projectId)
  }

  async save(delivery: Delivery): Promise<void> {
    const idx = this.deliveries.findIndex((d) => d.id === delivery.id)
    if (idx >= 0) this.deliveries[idx] = delivery
    else this.deliveries.push(delivery)
  }
}

export class FakeNotificationRepository implements NotificationRepository {
  notifications: Notification[] = []
  recipientsByProject = new Map<string, { personId: string; email: string }[]>()

  addRecipient(projectId: string, personId: string, email: string): void {
    const list = this.recipientsByProject.get(projectId) ?? []
    list.push({ personId, email })
    this.recipientsByProject.set(projectId, list)
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.find((n) => n.id === id) ?? null
  }

  async findByIdempotencyKey(key: string): Promise<Notification | null> {
    return (
      this.notifications.find((n) => n.idempotencyKey === key) ?? null
    )
  }

  async save(notification: Notification): Promise<void> {
    const idx = this.notifications.findIndex((n) => n.id === notification.id)
    if (idx >= 0) this.notifications[idx] = notification
    else this.notifications.push(notification)
  }

  async findRecipientsByProject(
    projectId: string,
    personIds: string[]
  ): Promise<{ personId: string; email: string }[]> {
    const all = this.recipientsByProject.get(projectId) ?? []
    return all.filter((r) => personIds.includes(r.personId))
  }
}

export class FakeCalendarEventRepository implements CalendarEventRepository {
  events: CalendarEvent[] = []

  async findById(id: string): Promise<CalendarEvent | null> {
    return this.events.find((e) => e.id === id) ?? null
  }

  async findByProject(projectId: string): Promise<CalendarEvent[]> {
    return this.events.filter((e) => e.projectId === projectId)
  }

  async findByExternalEventId(externalEventId: string): Promise<CalendarEvent | null> {
    return (
      this.events.find((e) => e.externalEventId === externalEventId) ?? null
    )
  }

  async save(event: CalendarEvent): Promise<void> {
    const idx = this.events.findIndex((e) => e.id === event.id)
    if (idx >= 0) this.events[idx] = event
    else this.events.push(event)
  }
}

export class FakeIntegrationConnectionRepository
  implements IntegrationConnectionRepository
{
  connections = new Map<string, IntegrationConnectionRow>()

  private key(projectId: string, provider: string): string {
    return `${projectId}:${provider}`
  }

  async findByProjectAndProvider(
    projectId: string,
    provider: string
  ): Promise<IntegrationConnectionRow | null> {
    return this.connections.get(this.key(projectId, provider)) ?? null
  }

  async save(connection: IntegrationConnectionRow): Promise<void> {
    this.connections.set(
      this.key(connection.projectId, connection.provider),
      { ...connection }
    )
  }
}

export class FakeAttachmentRepository implements AttachmentRepository {
  attachments: Attachment[] = []

  async findById(id: string): Promise<Attachment | null> {
    return this.attachments.find((a) => a.id === id) ?? null
  }

  async createPending(
    id: string,
    backlogItemId: string | null,
    deliveryId: string | null
  ): Promise<Attachment> {
    const attachment = Attachment.createPending(id, backlogItemId, deliveryId)
    this.attachments.push(attachment)
    return attachment
  }

  async save(attachment: Attachment): Promise<void> {
    const idx = this.attachments.findIndex((a) => a.id === attachment.id)
    if (idx >= 0) this.attachments[idx] = attachment
    else this.attachments.push(attachment)
  }
}

export class FakeAuditPort implements AuditPort {
  events: { actorId: string; projectId: string; record: AuditEventRecord }[] = []

  async record(
    actorId: string,
    projectId: string,
    record: AuditEventRecord
  ): Promise<void> {
    this.events.push({ actorId, projectId, record })
  }

  countEventType(eventType: string): number {
    return this.events.filter((e) => e.record.eventType === eventType).length
  }
}

export function makeBlocker(itemId: string, description: string): Blocker {
  return Blocker.create({
    id: `blocker-${Math.random().toString(36).slice(2)}`,
    backlogItemId: itemId,
    reportedBy: "person-1",
    description,
  })
}