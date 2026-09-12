import { AuthGateway } from "../ports/auth-gateway"
import {
  ProjectRepository,
  SprintRepository,
  BacklogItemRepository,
  DeliveryRepository,
  WorkflowColumnRepository,
} from "../ports/repositories"
import { Delivery } from "@/domain/delivery/delivery"

export interface BacklogItemOverview {
  id: string
  title: string
  frontId: string
  status: string
  priority: string
  hasOpenBlockers: boolean
}

export interface ColumnOverview {
  id: string
  name: string
  orderIndex: number
  itemCount: number
  wipLimit: number | null
  isFull: boolean
}

export interface SprintOverview {
  id: string
  goal: string
  status: string
  startsOn: string
  endsOn: string
}

export interface DeliveryOverview {
  id: string
  title: string
  status: string
  sprintId: string | null
  completedOn: string | null
}

export interface ProjectOverview {
  projectId: string
  projectName: string
  productGoal: string | null
  currentSprint: SprintOverview | null
  backlogItems: BacklogItemOverview[]
  columns: ColumnOverview[]
  openBlockers: number
  recentDeliveries: DeliveryOverview[]
}

export class GetProjectOverviewUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly projectRepository: ProjectRepository,
    private readonly sprintRepository: SprintRepository,
    private readonly backlogRepository: BacklogItemRepository,
    private readonly workflowColumnRepository: WorkflowColumnRepository,
    private readonly deliveryRepository: DeliveryRepository
  ) {}

  async execute(projectId: string): Promise<ProjectOverview> {
    await this.authGateway.requireProjectPermission(projectId)

    const [project, currentSprint, backlogItems, deliveries, columns] =
      await Promise.all([
        this.projectRepository.findById(projectId),
        this.sprintRepository.findCurrentByProject(projectId),
        this.backlogRepository.findByProject(projectId),
        this.deliveryRepository.findByProject(projectId),
        this.workflowColumnRepository.findByProject(projectId),
      ])

    if (!project) {
      throw new Error("Projeto não encontrado")
    }

    const itemCountByColumn = new Map<string, number>()
    for (const item of backlogItems) {
      const count = itemCountByColumn.get(item.columnId) ?? 0
      itemCountByColumn.set(item.columnId, count + 1)
    }

    const openBlockers = backlogItems.reduce(
      (acc, item) => acc + (item.hasOpenBlockers() ? 1 : 0),
      0
    )

    const columnsOverview: ColumnOverview[] = columns
      .filter((column) => column.active)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((column) => {
        const itemCount = itemCountByColumn.get(column.id) ?? 0
        const wipLimit = column.wipLimit?.getValue() ?? null
        return {
          id: column.id,
          name: column.name,
          orderIndex: column.orderIndex,
          itemCount,
          wipLimit,
          isFull: wipLimit !== null && itemCount >= wipLimit,
        } satisfies ColumnOverview
      })

    return {
      projectId,
      projectName: project.name,
      productGoal: project.productGoal?.statement ?? null,
      currentSprint: currentSprint
        ? {
            id: currentSprint.id,
            goal: currentSprint.goal,
            status: currentSprint.status.toString(),
            startsOn: currentSprint.period.getStartsOn().toISOString(),
            endsOn: currentSprint.period.getEndsOn().toISOString(),
          }
        : null,
      backlogItems: backlogItems.map((item) => ({
        id: item.id,
        title: item.title,
        frontId: item.frontId,
        status: item.status.toString(),
        priority: item.priority.toString(),
        hasOpenBlockers: item.hasOpenBlockers(),
      })),
      columns: columnsOverview,
      openBlockers,
      recentDeliveries: deliveries
        .sort((a, b) => {
          const stamp = (d: Delivery) =>
            d.completedOn ? d.completedOn.getTime() : 0
          return stamp(a) - stamp(b)
        })
        .slice(-5)
        .map((delivery) => ({
          id: delivery.id,
          title: delivery.title,
          status: delivery.status,
          sprintId: delivery.sprintId,
          completedOn: delivery.completedOn?.toISOString() ?? null,
        })),
    }
  }
}