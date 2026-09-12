import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  IntegrationConnectionRepository,
  IntegrationConnectionRow,
  AuditPort,
} from "../ports/repositories"

export interface ConnectIntegrationInput {
  projectId: string
  provider: string
  externalAccountId?: string
  scopes?: string[]
}

export interface ConnectIntegrationResult {
  connectionId: string
  provider: string
  status: string
}

export class ManageIntegrationConnectionUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly integrationConnectionRepository: IntegrationConnectionRepository,
    private readonly auditPort: AuditPort
  ) {}

  async connect(input: ConnectIntegrationInput): Promise<ConnectIntegrationResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["TECHNICAL_ADMIN", "COORDINATOR"]
    )

    const existing = await this.integrationConnectionRepository.findByProjectAndProvider(
      input.projectId,
      input.provider
    )

    const connection: IntegrationConnectionRow = existing ?? {
      id: randomUUID(),
      projectId: input.projectId,
      provider: input.provider,
      externalAccountId: null,
      status: "DISCONNECTED",
      scopesHash: null,
      connectedAt: null,
      revokedAt: null,
    }

    connection.status = "CONNECTED"
    connection.externalAccountId = input.externalAccountId ?? null
    connection.scopesHash = input.scopes
      ? this.hashScopes(input.scopes)
      : null
    connection.connectedAt = new Date()
    connection.revokedAt = null

    await this.integrationConnectionRepository.save(connection)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "INTEGRATION_CONNECTED",
      aggregateType: "IntegrationConnection",
      aggregateId: connection.id,
      metadata: { provider: input.provider },
    })

    return {
      connectionId: connection.id,
      provider: connection.provider,
      status: connection.status,
    }
  }

  async revoke(
    projectId: string,
    provider: string
  ): Promise<ConnectIntegrationResult> {
    const context = await this.authGateway.requireProjectPermission(projectId, [
      "TECHNICAL_ADMIN",
      "COORDINATOR",
    ])

    const connection =
      await this.integrationConnectionRepository.findByProjectAndProvider(
        projectId,
        provider
      )

    if (!connection) {
      throw new Error(`Integração "${provider}" não configurada neste projeto`)
    }

    connection.status = "REVOKED"
    connection.revokedAt = new Date()

    await this.integrationConnectionRepository.save(connection)

    await this.auditPort.record(context.user.personId, projectId, {
      eventType: "INTEGRATION_REVOKED",
      aggregateType: "IntegrationConnection",
      aggregateId: connection.id,
      metadata: { provider },
    })

    return {
      connectionId: connection.id,
      provider: connection.provider,
      status: connection.status,
    }
  }

  private hashScopes(scopes: string[]): string {
    return [...scopes].sort().join(",")
  }
}