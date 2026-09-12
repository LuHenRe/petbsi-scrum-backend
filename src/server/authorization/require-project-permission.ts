import { requireSession, AuthenticatedUser } from "./require-session"
import { db } from "@db/client"

export type ProjectRole =
  | "MEMBER"
  | "SCRUM_MASTER"
  | "COORDINATOR"
  | "PRODUCT_OWNER"
  | "STAKEHOLDER"
  | "TECHNICAL_ADMIN"

export interface ProjectContext {
  user: AuthenticatedUser
  projectId: string
  role: ProjectRole
}

export async function requireProjectPermission(
  projectId: string,
  allowedRoles?: ProjectRole[]
): Promise<ProjectContext> {
  const user = await requireSession()

  const membership = await db.projectMembership.findFirst({
    where: {
      projectId,
      personId: user.personId,
      endsOn: null,
    },
  })

  if (!membership) {
    throw new Error("Acesso negado: você não pertence a este projeto")
  }

  const role = membership.role as ProjectRole

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new Error(
      `Acesso negado: papel "${role}" não possui permissão para esta operação`
    )
  }

  return { user, projectId, role }
}

export function isProjectRole(role: string): role is ProjectRole {
  const validRoles: ProjectRole[] = [
    "MEMBER",
    "SCRUM_MASTER",
    "COORDINATOR",
    "PRODUCT_OWNER",
    "STAKEHOLDER",
    "TECHNICAL_ADMIN",
  ]
  return validRoles.includes(role as ProjectRole)
}
