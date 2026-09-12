import { describe, it, expect } from "vitest"
import { ManageIntegrationConnectionUseCase } from "@/application/integration/manage-integration-connection"
import {
  FakeAuthGateway,
  FakeIntegrationConnectionRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { PROJECT_ID } from "./fakes/fixtures"

describe("A12 — UC12 Configurar integração", () => {
  it("deve conectar integração e registrar auditoria", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "TECHNICAL_ADMIN")
    const connections = new FakeIntegrationConnectionRepository()
    const audit = new FakeAuditPort()

    const useCase = new ManageIntegrationConnectionUseCase(auth, connections, audit)
    const result = await useCase.connect({
      projectId: PROJECT_ID,
      provider: "google_drive",
      externalAccountId: "acc-drive-1",
      scopes: ["drive.file", "drive.metadata"],
    })

    expect(result.status).toBe("CONNECTED")
    expect(result.provider).toBe("google_drive")
    const stored = await connections.findByProjectAndProvider(
      PROJECT_ID,
      "google_drive"
    )
    expect(stored?.externalAccountId).toBe("acc-drive-1")
    expect(audit.countEventType("INTEGRATION_CONNECTED")).toBe(1)
  })

  it("deve revogar integração conectada", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "TECHNICAL_ADMIN")
    const connections = new FakeIntegrationConnectionRepository()
    const useCase = new ManageIntegrationConnectionUseCase(
      auth,
      connections,
      new FakeAuditPort()
    )

    await useCase.connect({
      projectId: PROJECT_ID,
      provider: "gmail",
      externalAccountId: "acc-gmail-1",
    })

    const revoked = await useCase.revoke(PROJECT_ID, "gmail")

    expect(revoked.status).toBe("REVOKED")
    const stored = await connections.findByProjectAndProvider(PROJECT_ID, "gmail")
    expect(stored?.revokedAt).not.toBeNull()
  })

  it("deve rejeitar revogação de integração não configurada", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "TECHNICAL_ADMIN")
    const useCase = new ManageIntegrationConnectionUseCase(
      auth,
      new FakeIntegrationConnectionRepository(),
      new FakeAuditPort()
    )

    await expect(useCase.revoke(PROJECT_ID, "google_calendar")).rejects.toThrow(
      "não configurada"
    )
  })

  it("deve negar conexão para papel sem permissão", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")
    const useCase = new ManageIntegrationConnectionUseCase(
      auth,
      new FakeIntegrationConnectionRepository(),
      new FakeAuditPort()
    )

    await expect(
      useCase.connect({ projectId: PROJECT_ID, provider: "google_drive" })
    ).rejects.toThrow("sem permissão")
  })
})