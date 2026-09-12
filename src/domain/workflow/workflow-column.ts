import { WipLimit } from "../shared/wip-limit"

export interface WorkflowColumnProps {
  id: string
  projectId: string
  name: string
  wipLimit?: number | null
  orderIndex: number
  active?: boolean
}

export class WorkflowColumn {
  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _name: string,
    private _wipLimit: WipLimit | null,
    private _orderIndex: number,
    private _active: boolean
  ) {}

  static create(props: WorkflowColumnProps): WorkflowColumn {
    if (!props.name.trim()) {
      throw new Error("Nome da coluna é obrigatório")
    }
    return new WorkflowColumn(
      props.id,
      props.projectId,
      props.name,
      WipLimit.create(props.wipLimit ?? null),
      props.orderIndex,
      props.active ?? true
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get name(): string {
    return this._name
  }

  get wipLimit(): WipLimit | null {
    return this._wipLimit
  }

  get orderIndex(): number {
    return this._orderIndex
  }

  get active(): boolean {
    return this._active
  }

  canReceive(currentCount: number): boolean {
    if (!this._wipLimit) return true
    return this._wipLimit.allows(currentCount)
  }

  isAtCapacity(currentCount: number): boolean {
    if (!this._wipLimit) return false
    return this._wipLimit.isAtCapacity(currentCount)
  }

  updateWipLimit(limit: number | null): void {
    this._wipLimit = WipLimit.create(limit)
  }

  reorder(newIndex: number): void {
    this._orderIndex = newIndex
  }
}
