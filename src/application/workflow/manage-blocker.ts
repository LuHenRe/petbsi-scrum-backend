import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  BacklogItemRepository,
  AuditPort,
} from "../ports/repositories"
import { Blocker } from "@/domain/blocker/blocker"

export interface OpenBlockerInput {
  projectId: string
  itemId: string
  description: string
}

export interface UpdateBlockerInput {
  projectId: string
  itemId: string
  blockerId: string
  description: string
}

export interface ResolveBlockerInput {
  projectId: string
  itemId: string
  blockerId: string
}

export interface ManageBlockerResult {
  blockerId: string
  itemId: string
  status: string
}

export class ManageBlockerUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly backlogRepository: BacklogItemRepository,
    private readonly auditPort: AuditPort
  ) {}

  async open(input: OpenBlockerInput): Promise<ManageBlockerResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["MEMBER", "SCRUM_MASTER", "COORDINATOR"]
    )

    const item = await this.backlogRepository.findById(input.itemId)
    if (!item || item.projectId !== input.projectId) {
      throw new Error("Item não encontrado no projeto")
    }

    const blocker = Blocker.create({
      id: randomUUID(),
      backlogItemId: input.itemId,
      reportedBy: context.user.personId,
      description: input.description,
    })

    item.registerBlocker(blocker)

    await this.backlogRepository.save(item)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BLOCKER_OPENED",
      aggregateType: "Blocker",
      aggregateId: blocker.id,
      metadata: { itemId: input.itemId },
    })

    return {
      blockerId: blocker.id,
      itemId: input.itemId,
      status: blocker.status,
    }
  }

  async update(input: UpdateBlockerInput): Promise<ManageBlockerResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["MEMBER", "SCRUM_MASTER", "COORDINATOR"]
    )

    const item = await this.backlogRepository.findById(input.itemId)
    if (!item || item.projectId !== input.projectId) {
      throw new Error("Item não encontrado no projeto")
    }

    const blocker = item.blockers.find((b) => b.id === input.blockerId)
    if (!blocker) {
      throw new Error(`Bloqueio "${input.blockerId}" não encontrado`)
    }

    blocker.updateDescription(input.description)
    await this.backlogRepository.save(item)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BLOCKER_UPDATED",
      aggregateType: "Blocker",
      aggregateId: blocker.id,
      metadata: { itemId: input.itemId },
    })

    return {
      blockerId: blocker.id,
      itemId: input.itemId,
      status: blocker.status,
    }
  }

  async resolve(input: ResolveBlockerInput): Promise<ManageBlockerResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["MEMBER", "SCRUM_MASTER", "COORDINATOR"]
    )

    const item = await this.backlogRepository.findById(input.itemId)
    if (!item || item.projectId !== input.projectId) {
      throw new Error("Item não encontrado no projeto")
    }

    const blocker = item.blockers.find((b) => b.id === input.blockerId)
    if (!blocker) {
      throw new Error(`Bloqueio "${input.blockerId}" não encontrado`)
    }

    item.resolveBlocker(input.blockerId, context.user.personId)

    await this.backlogRepository.save(item)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "BLOCKER_RESOLVED",
      aggregateType: "Blocker",
      aggregateId: blocker.id,
      metadata: { itemId: input.itemId },
    })

    return {
      blockerId: blocker.id,
      itemId: input.itemId,
      status: blocker.status,
    }
  }
}