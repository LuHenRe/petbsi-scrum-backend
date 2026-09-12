import { ProductGoal } from "./product-goal"
import { WorkFront } from "./work-front"
import { ProjectMembership } from "./project-membership"

export interface ProjectProps {
  id: string
  name: string
  status: string
  createdAt?: Date
  updatedAt?: Date
}

export class Project {
  private _productGoal: ProductGoal | null = null
  private _workFronts: WorkFront[] = []
  private _memberships: ProjectMembership[] = []

  private constructor(
    private readonly _id: string,
    private _name: string,
    private _status: string,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(props: ProjectProps): Project {
    return new Project(
      props.id,
      props.name,
      props.status ?? "ACTIVE",
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get status(): string {
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get productGoal(): ProductGoal | null {
    return this._productGoal
  }

  get workFronts(): readonly WorkFront[] {
    return this._workFronts
  }

  get memberships(): readonly ProjectMembership[] {
    return this._memberships
  }

  defineProductGoal(goal: ProductGoal): void {
    if (goal.projectId !== this._id) {
      throw new Error("Meta de produto pertence a outro projeto")
    }
    this._productGoal = goal
    this.touch()
  }

  addWorkFront(front: WorkFront): void {
    if (front.projectId !== this._id) {
      throw new Error("Frente de trabalho pertence a outro projeto")
    }
    const exists = this._workFronts.some((f) => f.name === front.name)
    if (exists) {
      throw new Error(`Frente "${front.name}" já existe no projeto`)
    }
    this._workFronts.push(front)
    this.touch()
  }

  addMembership(membership: ProjectMembership): void {
    if (membership.projectId !== this._id) {
      throw new Error("Membro pertence a outro projeto")
    }
    const duplicate = this._memberships.find(
      (m) =>
        m.personId === membership.personId &&
        m.role === membership.role &&
        !m.isExpired()
    )
    if (duplicate) {
      throw new Error(
        `Pessoa já possui papel "${membership.role}" ativo neste projeto`
      )
    }
    if (
      membership.role === "PRODUCT_OWNER" &&
      this.hasActiveProductOwner()
    ) {
      throw new Error("Projeto já possui um Product Owner ativo")
    }
    this._memberships.push(membership)
    this.touch()
  }

  loadWorkFronts(fronts: WorkFront[]): void {
    if (fronts.some((f) => f.projectId !== this._id)) {
      throw new Error("Frente de trabalho pertence a outro projeto")
    }
    this._workFronts = fronts
  }

  loadMemberships(memberships: ProjectMembership[]): void {
    if (memberships.some((m) => m.projectId !== this._id)) {
      throw new Error("Membro pertence a outro projeto")
    }
    this._memberships = memberships
  }

  hasActiveProductOwner(): boolean {
    return this._memberships.some(
      (m) => m.role === "PRODUCT_OWNER" && !m.isExpired()
    )
  }

  isArchived(): boolean {
    return this._status === "ARCHIVED"
  }

  private touch(): void {
    this._updatedAt = new Date()
  }
}
