import { SprintItem } from "../backlog/sprint-item"
import { BacklogItem } from "../backlog/backlog-item"
import { BacklogPolicy } from "../backlog/backlog-policy"
import { DateRange } from "../shared/date-range"
import { SprintStatus } from "../shared/sprint-status"
import {
  MissingSprintGoalError,
  ActiveSprintExistsError,
  InvalidTransitionError,
} from "../shared/errors"

export interface SprintProps {
  id: string
  projectId: string
  goal: string
  startsOn: Date
  endsOn: Date
  status?: string
}

export class Sprint {
  private _items: SprintItem[] = []
  private _itemIds: Set<string> = new Set()

  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _goal: string,
    private _period: DateRange,
    private _status: SprintStatus
  ) {}

  static create(props: SprintProps): Sprint {
    if (!props.goal.trim()) {
      throw new MissingSprintGoalError()
    }
    return new Sprint(
      props.id,
      props.projectId,
      props.goal,
      DateRange.create(props.startsOn, props.endsOn),
      SprintStatus.create(props.status ?? "DRAFT")
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get goal(): string {
    return this._goal
  }

  get period(): DateRange {
    return this._period
  }

  get status(): SprintStatus {
    return this._status
  }

  get items(): readonly SprintItem[] {
    return this._items
  }

  get itemIds(): ReadonlySet<string> {
    return this._itemIds
  }

  selectItem(item: BacklogItem): SprintItem {
    if (!this._status.canEditScope()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "seleção de item"
      )
    }
    BacklogPolicy.canAddToSprint(item, this._itemIds)

    const sprintItem = SprintItem.create({
      sprintId: this._id,
      backlogItemId: item.id,
      orderIndex: this._items.length,
    })

    this._items.push(sprintItem)
    this._itemIds.add(item.id)
    return sprintItem
  }

  removeItem(backlogItemId: string): void {
    if (!this._status.canEditScope()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "remoção de item"
      )
    }
    if (!this._itemIds.has(backlogItemId)) {
      throw new Error(`Item "${backlogItemId}" não está nesta Sprint`)
    }
    this._items = this._items.filter(
      (si) => si.backlogItemId !== backlogItemId
    )
    this._itemIds.delete(backlogItemId)
    this._items.forEach((si, index) => si.reorder(index))
  }

  promoteToPlanning(): void {
    if (!this._status.canPlan()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "PLANNING"
      )
    }
    this._status = SprintStatus.PLANNING
  }

  finalizePlanning(): void {
    if (!this._status.canFinalizePlan()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "PLANNED"
      )
    }
    this._status = SprintStatus.PLANNED
  }

  start(): void {
    if (!this._status.canStart()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "ACTIVE"
      )
    }
    if (!this._goal.trim()) {
      throw new MissingSprintGoalError()
    }
    this._status = SprintStatus.ACTIVE
  }

  adaptGoal(newGoal: string): void {
    if (!this._status.canAdapt()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "adaptação"
      )
    }
    if (!newGoal.trim()) {
      throw new MissingSprintGoalError()
    }
    this._goal = newGoal
  }

  defineGoal(newGoal: string): void {
    if (this._status.isTerminal()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "definição de meta"
      )
    }
    if (!newGoal.trim()) {
      throw new MissingSprintGoalError()
    }
    this._goal = newGoal
  }

  beginReview(): void {
    if (!this._status.canBeginReview()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "REVIEW"
      )
    }
    this._status = SprintStatus.REVIEW
  }

  beginRetrospective(): void {
    if (!this._status.canBeginRetrospective()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "RETROSPECTIVE"
      )
    }
    this._status = SprintStatus.RETROSPECTIVE
  }

  close(): void {
    if (!this._status.canClose()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "CLOSED"
      )
    }
    this._status = SprintStatus.CLOSED
  }

  cancel(): void {
    if (!this._status.canCancel()) {
      throw new InvalidTransitionError(
        "Sprint",
        this._status.toString(),
        "CANCELLED"
      )
    }
    this._status = SprintStatus.CANCELLED
  }

  isActive(): boolean {
    return this._status.isActive()
  }

  loadItems(items: SprintItem[]): void {
    this._items = items
    this._itemIds = new Set(items.map((si) => si.backlogItemId))
  }
}
