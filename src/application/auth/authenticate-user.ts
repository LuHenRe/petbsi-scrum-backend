import { AuthGateway } from "../ports/auth-gateway"
import { ProjectRepository } from "../ports/repositories"

export interface AuthenticatedUserResult {
  personId: string
  email: string
  displayName: string
  projectIds: string[]
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly projectRepository: ProjectRepository
  ) {}

  async execute(): Promise<AuthenticatedUserResult> {
    const user = await this.authGateway.getCurrentUser()

    const projectIds = await this.projectRepository.findProjectIdsByPerson(
      user.personId
    )

    return {
      personId: user.personId,
      email: user.email,
      displayName: user.displayName,
      projectIds,
    }
  }
}