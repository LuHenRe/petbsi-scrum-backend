export interface WorkItemStateChangeProps {
  id: string
  backlogItemId: string
  fromColumnId: string
  toColumnId: string
  changedBy: string
  reason?: string
  changedAt?: Date
}

export class WorkItemStateChange {
  private constructor(
    private readonly _id: string,
    private readonly _backlogItemId: string,
    private readonly _fromColumnId: string,
    private readonly _toColumnId: string,
    private readonly _changedBy: string,
    private readonly _reason: string | null,
    private readonly _changedAt: Date
  ) {}

  static create(props: WorkItemStateChangeProps): WorkItemStateChange {
    return new WorkItemStateChange(
      props.id,
      props.backlogItemId,
      props.fromColumnId,
      props.toColumnId,
      props.changedBy,
      props.reason ?? null,
      props.changedAt ?? new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get backlogItemId(): string {
    return this._backlogItemId
  }

  get fromColumnId(): string {
    return this._fromColumnId
  }

  get toColumnId(): string {
    return this._toColumnId
  }

  get changedBy(): string {
    return this._changedBy
  }

  get reason(): string | null {
    return this._reason
  }

  get changedAt(): Date {
    return this._changedAt
  }
}
