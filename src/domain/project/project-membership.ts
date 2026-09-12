import { DateRange } from "../shared/date-range"

export interface ProjectMembershipProps {
  id: string
  projectId: string
  personId: string
  frontId: string
  pairId?: string
  role: string
  startsOn?: Date
  endsOn?: Date
}

export class ProjectMembership {
  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private readonly _personId: string,
    private _frontId: string,
    private _pairId: string | null,
    private _role: string,
    private _startsOn: Date | null,
    private _endsOn: Date | null
  ) {}

  static create(props: ProjectMembershipProps): ProjectMembership {
    return new ProjectMembership(
      props.id,
      props.projectId,
      props.personId,
      props.frontId,
      props.pairId ?? null,
      props.role,
      props.startsOn ?? null,
      props.endsOn ?? null
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get personId(): string {
    return this._personId
  }

  get frontId(): string {
    return this._frontId
  }

  get pairId(): string | null {
    return this._pairId
  }

  get role(): string {
    return this._role
  }

  get startsOn(): Date | null {
    return this._startsOn ? new Date(this._startsOn) : null
  }

  get endsOn(): Date | null {
    return this._endsOn ? new Date(this._endsOn) : null
  }

  isExpired(): boolean {
    if (!this._endsOn) return false
    return this._endsOn < new Date()
  }

  isValid(): boolean {
    if (!this._startsOn) return true
    if (this._endsOn && this._endsOn < new Date()) return false
    return true
  }

  endMembership(date: Date = new Date()): void {
    this._endsOn = date
  }

  changeRole(newRole: string): void {
    this._role = newRole
  }

  changeFront(newFrontId: string): void {
    this._frontId = newFrontId
  }
}
