import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  BacklogItemRepository,
  ProjectRepository,
  AuditPort,
} from "../ports/repositories"
import { BacklogItem } from "@/domain/backlog/backlog-item"
import { BacklogPolicy } from "@/domain/backlog/backlog-policy"

export interface CreateBacklogItemInput {
  projectId: string
  frontId: string
  columnId: string
  title: string
  description?: string
  priority?: string
}

export interface UpdateBacklogItemInput {
  itemId: string
  projectId: string
  title?: string
  description?: string | null
  frontId?: string
  priority?: string
  assigneeId?: string
}

export interface ReorderBacklogInput {
  projectId: string
  itemIds: string[]
}

export interface BacklogItemResult {
  id: string
  title: string
  status: string
  priority: string
}

export class ManageBacklogUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly projectRepository: ProjectRepository,
    private readonly backlogRepository: BacklogItemRepository,
    private readonly auditPort: AuditPort
  ) {}

  async create(input: CreateBacklogItemInput): Promise<BacklogItemResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["PRODUCT_OWNER"]
    )

    const project = await this.projectRepository.findById(input.projectId)
    if (!project || project.isArchived()) {
      throw new Error("Projeto não encontrado ou arquivado")
    }

    const item = BacklogItem.create({
      id: randomUUID(),
      projectId: input.projectId,
      frontId: input.frontId,
      columnId: input.columnId,
      title: input.title,
      description: input.description,
      priority: input.priority,
    })

    await this.backlogRepository.save(item)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BACKLOG_ITEM_CREATED",
      aggregateType: "BacklogItem",
      aggregateId: item.id,
      metadata: { title: item.title },
    })

    return {
      id: item.id,
      title: item.title,
      status: item.status.toString(),
      priority: item.priority.toString(),
    }
  }

  async update(input: UpdateBacklogItemInput): Promise<BacklogItemResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["PRODUCT_OWNER", "SCRUM_MASTER"]
    )

    const item = await this.backlogRepository.findById(input.itemId)
    if (!item || item.projectId !== input.projectId) {
      throw new Error("Item não encontrado no projeto")
    }

    if (input.title !== undefined) item.updateTitle(input.title)
    if (input.description !== undefined) item.updateDescription(input.description)
    if (input.frontId !== undefined) item.changeFront(input.frontId)
    if (input.priority !== undefined) item.updatePriority(input.priority)
    if (input.assigneeId !== undefined) item.assignTo(input.assigneeId)

    await this.backlogRepository.save(item)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BACKLOG_ITEM_UPDATED",
      aggregateType: "BacklogItem",
      aggregateId: item.id,
    })

    return {
      id: item.id,
      title: item.title,
      status: item.status.toString(),
      priority: item.priority.toString(),
    }
  }

  async reorder(input: ReorderBacklogInput): Promise<void> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["PRODUCT_OWNER"]
    )

    BacklogPolicy.canReorder(input.itemIds)

    const items = await this.backlogRepository.findByProject(input.projectId)
    const itemMap = new Map(items.map((item) => [item.id, item]))

    input.itemIds.forEach((itemId, index) => {
      const item = itemMap.get(itemId)
      if (!item) {
        throw new Error(`Item "${itemId}" não pertence ao projeto`)
      }
      item.reorder(index)
    })

    for (const itemId of input.itemIds) {
      const item = itemMap.get(itemId)
      if (item) {
        await this.backlogRepository.save(item)
      }
    }

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BACKLOG_REORDERED",
      aggregateType: "Backlog",
      aggregateId: input.projectId,
      metadata: { order: input.itemIds },
    })
  }
}