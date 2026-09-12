import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  BacklogItemRepository,
  WorkflowColumnRepository,
  AuditPort,
} from "../ports/repositories"
import { WipPolicy } from "@/domain/workflow/wip-policy"

export interface MoveBacklogItemInput {
  projectId: string
  itemId: string
  toColumnId: string
  reason?: string
  overrideWip?: boolean
}

export interface BacklogItemMoveResult {
  itemId: string
  fromColumnId: string
  toColumnId: string
  stateChangeId: string
}

export class MoveBacklogItemUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly backlogRepository: BacklogItemRepository,
    private readonly workflowColumnRepository: WorkflowColumnRepository,
    private readonly auditPort: AuditPort
  ) {}

  async execute(input: MoveBacklogItemInput): Promise<BacklogItemMoveResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["MEMBER", "SCRUM_MASTER", "COORDINATOR"]
    )

    const item = await this.backlogRepository.findById(input.itemId)
    if (!item || item.projectId !== input.projectId) {
      throw new Error("Item não encontrado no projeto")
    }

    if (item.columnId === input.toColumnId) {
      throw new Error("Item já está na coluna de destino")
    }

    const targetColumn = await this.workflowColumnRepository.findById(
      input.toColumnId
    )
    if (!targetColumn || targetColumn.projectId !== input.projectId) {
      throw new Error(`Coluna "${input.toColumnId}" não encontrada no projeto`)
    }

    const currentCount = await this.backlogRepository.countByColumn(
      input.toColumnId
    )

    if (!input.overrideWip) {
      WipPolicy.validateMove(targetColumn, currentCount)
    }

    const change = item.moveTo(
      input.toColumnId,
      context.user.personId,
      randomUUID(),
      input.reason
    )

    await this.backlogRepository.save(item)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BACKLOG_ITEM_MOVED",
      aggregateType: "BacklogItem",
      aggregateId: item.id,
      metadata: {
        from: change.fromColumnId,
        to: change.toColumnId,
        reason: input.reason,
      },
    })

    return {
      itemId: item.id,
      fromColumnId: change.fromColumnId,
      toColumnId: change.toColumnId,
      stateChangeId: change.id,
    }
  }
}