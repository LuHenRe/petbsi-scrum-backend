import { AuthGateway } from "../ports/auth-gateway"
import {
  DeliveryRepository,
  BacklogItemRepository,
} from "../ports/repositories"

export interface DeliveryHistoryFilter {
  projectId: string
  frontId?: string
  sprintId?: string
  status?: string
  from?: Date
  to?: Date
}

export interface DeliveryHistoryItem {
  id: string
  title: string
  description: string | null
  status: string
  sprintId: string | null
  completedOn: string | null
  linkedBacklogItemIds: string[]
}

export interface DeliveryHistoryResult {
  items: DeliveryHistoryItem[]
  total: number
}

export class QueryDeliveryHistoryUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly deliveryRepository: DeliveryRepository,
    private readonly backlogItemRepository: BacklogItemRepository
  ) {}

  async execute(filter: DeliveryHistoryFilter): Promise<DeliveryHistoryResult> {
    await this.authGateway.requireProjectPermission(filter.projectId, [
      "COORDINATOR",
      "STAKEHOLDER",
      "SCRUM_MASTER",
    ])

    let deliveries = await this.deliveryRepository.findByProject(
      filter.projectId
    )

    if (filter.status) {
      deliveries = deliveries.filter((d) => d.status === filter.status)
    }

    if (filter.sprintId) {
      deliveries = deliveries.filter((d) => d.sprintId === filter.sprintId)
    }

    if (filter.from) {
      deliveries = deliveries.filter(
        (d) => d.completedOn !== null && d.completedOn! >= filter.from!
      )
    }

    if (filter.to) {
      deliveries = deliveries.filter(
        (d) => d.completedOn !== null && d.completedOn! <= filter.to!
      )
    }

    if (filter.frontId) {
      const filteredByFront: typeof deliveries = []
      for (const delivery of deliveries) {
        const contributedItems = await this.backlogItemRepository.findByProject(
          filter.projectId
        )
        const hasFront = delivery.itemIds.some((itemId) =>
          contributedItems.some(
            (item) => item.id === itemId && item.frontId === filter.frontId
          )
        )
        if (hasFront) filteredByFront.push(delivery)
      }
      deliveries = filteredByFront
    }

    const items: DeliveryHistoryItem[] = deliveries.map((delivery) => ({
      id: delivery.id,
      title: delivery.title,
      description: delivery.description,
      status: delivery.status,
      sprintId: delivery.sprintId,
      completedOn: delivery.completedOn?.toISOString() ?? null,
      linkedBacklogItemIds: [...delivery.itemIds],
    }))

    return {
      items,
      total: items.length,
    }
  }
}