const VALID_ROLES = [
  "MEMBER",
  "SCRUM_MASTER",
  "COORDINATOR",
  "PRODUCT_OWNER",
  "STAKEHOLDER",
  "TECHNICAL_ADMIN",
] as const

export type ProjectRoleValue = (typeof VALID_ROLES)[number]

export class ProjectRole {
  private constructor(private readonly value: ProjectRoleValue) {}

  static create(value: string): ProjectRole {
    const normalized = value.toUpperCase() as ProjectRoleValue
    if (!VALID_ROLES.includes(normalized)) {
      throw new Error(`Papel inválido: "${value}". Papéis válidos: ${VALID_ROLES.join(", ")}`)
    }
    return new ProjectRole(normalized)
  }

  static readonly MEMBER = new ProjectRole("MEMBER")
  static readonly SCRUM_MASTER = new ProjectRole("SCRUM_MASTER")
  static readonly COORDINATOR = new ProjectRole("COORDINATOR")
  static readonly PRODUCT_OWNER = new ProjectRole("PRODUCT_OWNER")
  static readonly STAKEHOLDER = new ProjectRole("STAKEHOLDER")
  static readonly TECHNICAL_ADMIN = new ProjectRole("TECHNICAL_ADMIN")

  is(value: ProjectRoleValue): boolean {
    return this.value === value
  }

  equals(other: ProjectRole): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): ProjectRoleValue {
    return this.value
  }
}
