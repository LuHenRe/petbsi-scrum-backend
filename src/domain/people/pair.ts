export interface PairProps {
  id: string
  projectId: string
  name: string
  responsibility?: string
  active?: boolean
}

export class Pair {
  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _name: string,
    private _responsibility: string,
    private _active: boolean
  ) {}

  static create(props: PairProps): Pair {
    if (!props.name.trim()) {
      throw new Error("Nome da dupla é obrigatório")
    }
    return new Pair(
      props.id,
      props.projectId,
      props.name,
      props.responsibility ?? "",
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

  get responsibility(): string {
    return this._responsibility
  }

  get active(): boolean {
    return this._active
  }

  deactivate(): void {
    this._active = false
  }
}
