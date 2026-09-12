const VALID_STATUSES = [
  "DRAFT",
  "PLANNING",
  "PLANNED",
  "ACTIVE",
  "REVIEW",
  "RETROSPECTIVE",
  "CLOSED",
  "CANCELLED",
] as const

export type SprintStatusValue = (typeof VALID_STATUSES)[number]

export class SprintStatus {
  private constructor(private readonly value: SprintStatusValue) {}

  static create(value: string): SprintStatus {
    const normalized = value.toUpperCase().replace(/\s+/g, "_") as SprintStatusValue
    if (!VALID_STATUSES.includes(normalized)) {
      throw new Error(`Status de Sprint inválido: "${value}"`)
    }
    return new SprintStatus(normalized)
  }

  static readonly DRAFT = new SprintStatus("DRAFT")
  static readonly PLANNING = new SprintStatus("PLANNING")
  static readonly PLANNED = new SprintStatus("PLANNED")
  static readonly ACTIVE = new SprintStatus("ACTIVE")
  static readonly REVIEW = new SprintStatus("REVIEW")
  static readonly RETROSPECTIVE = new SprintStatus("RETROSPECTIVE")
  static readonly CLOSED = new SprintStatus("CLOSED")
  static readonly CANCELLED = new SprintStatus("CANCELLED")

  canStart(): boolean {
    return this.value === "PLANNED"
  }

  is(value: SprintStatusValue): boolean {
    return this.value === value
  }

  canPlan(): boolean {
    return this.value === "DRAFT"
  }

  canEditScope(): boolean {
    return this.value === "DRAFT" || this.value === "PLANNING" || this.value === "PLANNED"
  }

  canFinalizePlan(): boolean {
    return this.value === "PLANNING"
  }

  canAdapt(): boolean {
    return this.value === "ACTIVE"
  }

  canBeginReview(): boolean {
    return this.value === "ACTIVE"
  }

  canBeginRetrospective(): boolean {
    return this.value === "REVIEW"
  }

  canClose(): boolean {
    return this.value === "REVIEW" || this.value === "RETROSPECTIVE"
  }

  canCancel(): boolean {
    return !this.isTerminal()
  }

  isActive(): boolean {
    return this.value === "ACTIVE"
  }

  isTerminal(): boolean {
    return this.value === "CLOSED" || this.value === "CANCELLED"
  }

  equals(other: SprintStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): SprintStatusValue {
    return this.value
  }
}
