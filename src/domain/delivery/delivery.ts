export interface DeliveryProps {
  id: string
  projectId: string
  sprintId?: string
  title: string
  description?: string
  status?: string
  completedOn?: Date
}

export class Delivery {
  private _itemIds: string[] = []

  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _sprintId: string | null,
    private _title: string,
    private _description: string | null,
    private _status: string,
    private _completedOn: Date | null
  ) {}

  static create(props: DeliveryProps): Delivery {
    if (!props.title.trim()) {
      throw new Error("Título da entrega é obrigatório")
    }
    return new Delivery(
      props.id,
      props.projectId,
      props.sprintId ?? null,
      props.title,
      props.description ?? null,
      props.status ?? "PLANNED",
      props.completedOn ?? null
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get sprintId(): string | null {
    return this._sprintId
  }

  get title(): string {
    return this._title
  }

  get description(): string | null {
    return this._description
  }

  get status(): string {
    return this._status
  }

  get completedOn(): Date | null {
    return this._completedOn ? new Date(this._completedOn) : null
  }

  get itemIds(): readonly string[] {
    return this._itemIds
  }

  complete(): void {
    if (this._status === "COMPLETED") {
      throw new Error("Entrega já foi concluída")
    }
    this._status = "COMPLETED"
    this._completedOn = new Date()
  }

  linkItem(backlogItemId: string): void {
    if (!this._itemIds.includes(backlogItemId)) {
      this._itemIds.push(backlogItemId)
    }
  }

  unlinkItem(backlogItemId: string): void {
    this._itemIds = this._itemIds.filter((id) => id !== backlogItemId)
  }

  loadItemIds(ids: string[]): void {
    this._itemIds = ids
  }

  updateTitle(title: string): void {
    if (!title.trim()) throw new Error("Título da entrega é obrigatório")
    this._title = title
  }
}
