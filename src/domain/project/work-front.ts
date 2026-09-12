export interface WorkFrontProps {
  id: string
  projectId: string
  name: string
  description?: string
  active?: boolean
}

export class WorkFront {
  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _name: string,
    private _description: string,
    private _active: boolean
  ) {}

  static create(props: WorkFrontProps): WorkFront {
    if (!props.name.trim()) {
      throw new Error("Nome da frente é obrigatório")
    }
    return new WorkFront(
      props.id,
      props.projectId,
      props.name,
      props.description ?? "",
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

  get description(): string {
    return this._description
  }

  get active(): boolean {
    return this._active
  }

  deactivate(): void {
    this._active = false
  }

  activate(): void {
    this._active = true
  }
}
