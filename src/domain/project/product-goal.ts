export interface ProductGoalProps {
  id: string
  projectId: string
  statement: string
  status?: string
  createdAt?: Date
}

export class ProductGoal {
  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _statement: string,
    private _status: string,
    private readonly _createdAt: Date
  ) {}

  static create(props: ProductGoalProps): ProductGoal {
    if (!props.statement.trim()) {
      throw new Error("Declaração da Meta do Produto é obrigatória")
    }
    return new ProductGoal(
      props.id,
      props.projectId,
      props.statement,
      props.status ?? "ACTIVE",
      props.createdAt ?? new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get statement(): string {
    return this._statement
  }

  get status(): string {
    return this._status
  }

  updateStatement(statement: string): void {
    if (!statement.trim()) {
      throw new Error("Declaração da Meta do Produto é obrigatória")
    }
    this._statement = statement
  }

  deactivate(): void {
    this._status = "INACTIVE"
  }
}
