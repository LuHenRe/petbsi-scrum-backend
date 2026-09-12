export interface AuthenticatedUser {
  personId: string
  email: string
  displayName: string
}

export interface ProjectRoleContext {
  user: AuthenticatedUser
  projectId: string
  role: string
}

export interface AuthGateway {
  getCurrentUser(): Promise<AuthenticatedUser>
  requireProjectPermission(
    projectId: string,
    allowedRoles?: string[]
  ): Promise<ProjectRoleContext>
}