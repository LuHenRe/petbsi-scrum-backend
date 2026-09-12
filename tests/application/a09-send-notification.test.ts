import { describe, it, expect } from "vitest"
import { SendNotificationUseCase } from "@/application/notifications/send-notification"
import {
  FakeAuthGateway,
  FakeNotificationRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { FakeEmailGateway } from "./fakes/fake-gateways"
import { PROJECT_ID } from "./fakes/fixtures"

function setup() {
  const auth = new FakeAuthGateway()
  auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
  const notifications = new FakeNotificationRepository()
  notifications.addRecipient(PROJECT_ID, "person-2", "member@example.com")
  notifications.addRecipient(PROJECT_ID, "person-3", "po@example.com")
  const email = new FakeEmailGateway()
  const audit = new FakeAuditPort()
  const useCase = new SendNotificationUseCase(auth, notifications, email, audit)
  return { auth, notifications, email, audit, useCase }
}

describe("A09 — UC09 Enviar notificação Gmail", () => {
  it("deve enviar notificação e registrar auditoria", async () => {
    const { useCase, email, audit } = setup()

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      subject: "Reunião de quarta",
      body: "Pauta da reunião",
      recipientPersonIds: ["person-2", "person-3"],
    })

    expect(result.status).toBe("SENT")
    expect(result.sentAt).not.toBeNull()
    expect(email.calls).toHaveLength(1)
    expect(email.calls[0].to).toEqual(["member@example.com", "po@example.com"])
    expect(audit.countEventType("NOTIFICATION_SENT")).toBe(1)
  })

  it("deve rejeitar destinatário fora do projeto", async () => {
    const { useCase } = setup()

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        subject: "Assunto",
        body: "Corpo",
        recipientPersonIds: ["person-2", "person-99"],
      })
    ).rejects.toThrow("Destinatário")
  })

  it("deve marcar FAILED quando o Gmail falha", async () => {
    const { useCase, email, audit } = setup()
    email.fail = true

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      subject: "Assunto",
      body: "Corpo",
      recipientPersonIds: ["person-2"],
    })

    expect(result.status).toBe("FAILED")
    expect(result.errorMessage).toContain("indisponível")
    expect(audit.countEventType("NOTIFICATION_SENT")).toBe(0)
  })

  it("deve ser idempotente ao reutilizar a mesma chave", async () => {
    const { useCase, email } = setup()

    const first = await useCase.execute({
      projectId: PROJECT_ID,
      subject: "Assunto",
      body: "Corpo",
      recipientPersonIds: ["person-2"],
      idempotencyKey: "key-notif-1",
    })

    const second = await useCase.execute({
      projectId: PROJECT_ID,
      subject: "Assunto",
      body: "Corpo",
      recipientPersonIds: ["person-2"],
      idempotencyKey: "key-notif-1",
    })

    expect(first.notificationId).toBe(second.notificationId)
    expect(email.calls).toHaveLength(1)
  })

  it("deve reenviar notificação que falhou usando a mesma chave", async () => {
    const { useCase, email, audit } = setup()
    email.fail = true

    const first = await useCase.execute({
      projectId: PROJECT_ID,
      subject: "Assunto",
      body: "Corpo",
      recipientPersonIds: ["person-2"],
      idempotencyKey: "key-retry-1",
    })

    expect(first.status).toBe("FAILED")

    email.fail = false
    const second = await useCase.execute({
      projectId: PROJECT_ID,
      subject: "Assunto",
      body: "Corpo",
      recipientPersonIds: ["person-2"],
      idempotencyKey: "key-retry-1",
    })

    expect(second.notificationId).toBe(first.notificationId)
    expect(second.status).toBe("SENT")
    expect(email.calls).toHaveLength(2)
    expect(audit.countEventType("NOTIFICATION_SENT")).toBe(1)
    expect(audit.countEventType("NOTIFICATION_FAILED")).toBe(1)
  })
})