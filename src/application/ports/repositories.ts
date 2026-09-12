import { Project } from "@/domain/project/project"
import { Sprint } from "@/domain/sprint/sprint"
import { BacklogItem } from "@/domain/backlog/backlog-item"
import { Blocker } from "@/domain/blocker/blocker"
import { Delivery } from "@/domain/delivery/delivery"
import { Notification } from "@/domain/integration/notification"
import { CalendarEvent } from "@/domain/integration/calendar-event"
import { Attachment } from "@/domain/integration/attachment"
import { WorkflowColumn } from "@/domain/workflow/workflow-column"

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>
  findProjectIdsByPerson(personId: string): Promise<string[]>
  save(project: Project): Promise<void>
}

export interface SprintRepository {
  findById(id: string): Promise<Sprint | null>
  findActiveByProject(projectId: string): Promise<Sprint | null>
  findCurrentByProject(projectId: string): Promise<Sprint | null>
  save(sprint: Sprint): Promise<void>
}

export interface BacklogItemRepository {
  findById(id: string): Promise<BacklogItem | null>
  findByIdConcurrent(id: string): Promise<BacklogItem | null>
  findByProject(projectId: string): Promise<BacklogItem[]>
  findBySprint(sprintId: string): Promise<BacklogItem[]>
  findByColumn(columnId: string): Promise<BacklogItem[]>
  save(item: BacklogItem): Promise<void>
  countByColumn(columnId: string): Promise<number>
}

export interface WorkflowColumnRepository {
  findById(id: string): Promise<WorkflowColumn | null>
  findByProject(projectId: string): Promise<WorkflowColumn[]>
  save(column: WorkflowColumn): Promise<void>
}

export interface DeliveryRepository {
  findById(id: string): Promise<Delivery | null>
  findByProject(projectId: string): Promise<Delivery[]>
  save(delivery: Delivery): Promise<void>
}

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>
  findByIdempotencyKey(key: string): Promise<Notification | null>
  save(notification: Notification): Promise<void>
  findRecipientsByProject(
    projectId: string,
    personIds: string[]
  ): Promise<{ personId: string; email: string }[]>
}

export interface CalendarEventRepository {
  findById(id: string): Promise<CalendarEvent | null>
  findByProject(projectId: string): Promise<CalendarEvent[]>
  findByExternalEventId(externalEventId: string): Promise<CalendarEvent | null>
  save(event: CalendarEvent): Promise<void>
}

export interface IntegrationConnectionRepository {
  findByProjectAndProvider(
    projectId: string,
    provider: string
  ): Promise<IntegrationConnectionRow | null>
  save(connection: IntegrationConnectionRow): Promise<void>
}

export interface IntegrationConnectionRow {
  id: string
  projectId: string
  provider: string
  externalAccountId: string | null
  status: string
  scopesHash: string | null
  connectedAt: Date | null
  revokedAt: Date | null
}

export interface AttachmentRepository {
  findById(id: string): Promise<Attachment | null>
  createPending(
    id: string,
    backlogItemId: string | null,
    deliveryId: string | null
  ): Promise<Attachment>
  save(attachment: Attachment): Promise<void>
}

export interface AuditEventRecord {
  eventType: string
  aggregateType: string
  aggregateId: string
  metadata?: Record<string, unknown>
}

export interface AuditPort {
  record(
    actorId: string,
    projectId: string,
    record: AuditEventRecord
  ): Promise<void>
}