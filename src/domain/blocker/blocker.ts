export interface BlockerProps {
  id: string
  backlogItemId: string
  reportedBy: string
  resolvedBy?: string
  description: string
  status?: string
  createdAt?: Date
  resolvedAt?: Date
}

export class Blocker {
  private constructor(
    private readonly _id: string,
    private readonly _backlogItemId: string,
    private readonly _reportedBy: string,
    private _resolvedBy: string | null,
    private _description: string,
    private _status: string,
    private readonly _createdAt: Date,
    private _resolvedAt: Date | null
  ) {}

  static create(props: BlockerProps): Blocker {
    if (!props.description.trim()) {
      throw new Error("Descrição do bloqueio é obrigatória")
    }
    return new Blocker(
      props.id,
      props.backlogItemId,
      props.reportedBy,
      props.resolvedBy ?? null,
      props.description,
      props.status ?? "OPEN",
      props.createdAt ?? new Date(),
      props.resolvedAt ?? null
    )
  }

  get id(): string {
    return this._id
  }

  get backlogItemId(): string {
    return this._backlogItemId
  }

  get reportedBy(): string {
    return this._reportedBy
  }

  get resolvedBy(): string | null {
    return this._resolvedBy
  }

  get description(): string {
    return this._description
  }

  get status(): string {
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get resolvedAt(): Date | null {
    return this._resolvedAt ? new Date(this._resolvedAt) : null
  }

  isOpen(): boolean {
    return this._status === "OPEN"
  }

  resolve(resolvedBy: string): void {
    if (!this.isOpen()) {
      throw new Error(`Bloqueio "${this._id}" já foi resolvido`)
    }
    this._status = "RESOLVED"
    this._resolvedBy = resolvedBy
    this._resolvedAt = new Date()
  }

  reopen(): void {
    this._status = "OPEN"
    this._resolvedBy = null
    this._resolvedAt = null
  }

  updateDescription(description: string): void {
    if (!description.trim()) {
      throw new Error("Descrição do bloqueio é obrigatória")
    }
    this._description = description
  }
}
