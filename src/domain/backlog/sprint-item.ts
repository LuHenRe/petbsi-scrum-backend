export interface SprintItemProps {
  sprintId: string
  backlogItemId: string
  orderIndex: number
}

export class SprintItem {
  private constructor(
    private readonly _sprintId: string,
    private readonly _backlogItemId: string,
    private _orderIndex: number
  ) {}

  static create(props: SprintItemProps): SprintItem {
    return new SprintItem(
      props.sprintId,
      props.backlogItemId,
      props.orderIndex
    )
  }

  get sprintId(): string {
    return this._sprintId
  }

  get backlogItemId(): string {
    return this._backlogItemId
  }

  get orderIndex(): number {
    return this._orderIndex
  }

  reorder(newIndex: number): void {
    if (!Number.isInteger(newIndex) || newIndex < 0) {
      throw new Error(`Índice de ordenação inválido: ${newIndex}`)
    }
    this._orderIndex = newIndex
  }
}
