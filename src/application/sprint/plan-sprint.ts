import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  SprintRepository,
  BacklogItemRepository,
  AuditPort,
} from "../ports/repositories"
import { Sprint } from "@/domain/sprint/sprint"
import { ActiveSprintExistsError } from "@/domain/shared/errors"

export interface CreateSprintInput {
  projectId: string
  goal: string
  startsOn: Date
  endsOn: Date
}

export interface UpdateSprintInput {
  sprintId: string
  projectId: string
  goal?: string
}

export interface SelectItemToSprintInput {
  sprintId: string
  projectId: string
  backlogItemId: string
}

export interface RemoveItemFromSprintInput {
  sprintId: string
  projectId: string
  backlogItemId: string
}

export interface StartSprintInput {
  sprintId: string
  projectId: string
}

export interface CloseSprintInput {
  sprintId: string
  projectId: string
}

export interface PlanSprintInput {
  sprintId: string
  projectId: string
  goal?: string
  itemIdsToAdd?: string[]
  itemIdsToRemove?: string[]
  finalizePlanning?: boolean
  start?: boolean
}

export interface SprintResult {
  id: string
  goal: string
  status: string
  startsOn: string
  endsOn: string
}

export class PlanSprintUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly sprintRepository: SprintRepository,
    private readonly backlogItemRepository: BacklogItemRepository,
    private readonly auditPort: AuditPort
  ) {}

  async create(input: CreateSprintInput): Promise<SprintResult> {
    await this.authGateway.requireProjectPermission(input.projectId)

    const active = await this.sprintRepository.findActiveByProject(
      input.projectId
    )
    if (active) {
      throw new ActiveSprintExistsError(input.projectId)
    }

    const sprint = Sprint.create({
      id: randomUUID(),
      projectId: input.projectId,
      goal: input.goal,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
    })

    await this.sprintRepository.save(sprint)

    return {
      id: sprint.id,
      goal: sprint.goal,
      status: sprint.status.toString(),
      startsOn: sprint.period.getStartsOn().toISOString(),
      endsOn: sprint.period.getEndsOn().toISOString(),
    }
  }

  async plan(input: PlanSprintInput): Promise<SprintResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["PRODUCT_OWNER", "SCRUM_MASTER", "MEMBER"]
    )

    const sprint = await this.sprintRepository.findById(input.sprintId)
    if (!sprint || sprint.projectId !== input.projectId) {
      throw new Error("Sprint não encontrada no projeto")
    }

    if (sprint.status.isTerminal()) {
      throw new Error("Sprint encerrada não pode mais ser planejada")
    }

    if (input.goal !== undefined) {
      sprint.defineGoal(input.goal)
    }

    if (input.itemIdsToAdd) {
      for (const itemId of input.itemIdsToAdd) {
        if (sprint.itemIds.has(itemId)) {
          throw new Error(`Item "${itemId}" já está nesta Sprint`)
        }
        const item = await this.backlogItemRepository.findById(itemId)
        if (!item || item.projectId !== input.projectId) {
          throw new Error(`Item "${itemId}" não encontrado no projeto`)
        }
        sprint.selectItem(item)
      }
    }

    if (input.itemIdsToRemove) {
      for (const itemId of input.itemIdsToRemove) {
        sprint.removeItem(itemId)
      }
    }

    if (sprint.status.canPlan()) {
      sprint.promoteToPlanning()
    }

    if (input.finalizePlanning) {
      sprint.finalizePlanning()
    }

    await this.sprintRepository.save(sprint)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "SPRINT_PLANNED",
      aggregateType: "Sprint",
      aggregateId: sprint.id,
      metadata: {
        goal: sprint.goal,
        itemCount: sprint.items.length,
      },
    })

    return {
      id: sprint.id,
      goal: sprint.goal,
      status: sprint.status.toString(),
      startsOn: sprint.period.getStartsOn().toISOString(),
      endsOn: sprint.period.getEndsOn().toISOString(),
    }
  }

  async start(input: StartSprintInput): Promise<SprintResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["PRODUCT_OWNER", "SCRUM_MASTER"]
    )

    const sprint = await this.sprintRepository.findById(input.sprintId)
    if (!sprint || sprint.projectId !== input.projectId) {
      throw new Error("Sprint não encontrada no projeto")
    }

    const active = await this.sprintRepository.findActiveByProject(
      input.projectId
    )
    if (active && active.id !== sprint.id) {
      throw new ActiveSprintExistsError(input.projectId)
    }

    sprint.start()
    await this.sprintRepository.save(sprint)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "SPRINT_STARTED",
      aggregateType: "Sprint",
      aggregateId: sprint.id,
    })

    return this.toResult(sprint)
  }

  async close(input: CloseSprintInput): Promise<SprintResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["SCRUM_MASTER", "COORDINATOR"]
    )

    const sprint = await this.sprintRepository.findById(input.sprintId)
    if (!sprint || sprint.projectId !== input.projectId) {
      throw new Error("Sprint não encontrada no projeto")
    }

    sprint.close()
    await this.sprintRepository.save(sprint)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "SPRINT_CLOSED",
      aggregateType: "Sprint",
      aggregateId: sprint.id,
    })

    return this.toResult(sprint)
  }

  private toResult(sprint: Sprint): SprintResult {
    return {
      id: sprint.id,
      goal: sprint.goal,
      status: sprint.status.toString(),
      startsOn: sprint.period.getStartsOn().toISOString(),
      endsOn: sprint.period.getEndsOn().toISOString(),
    }
  }
}