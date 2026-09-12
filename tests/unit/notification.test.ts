import { describe, it, expect } from "vitest"
import { Notification } from "@/domain/integration/notification"
import { EmailAddress } from "@/domain/shared/email-address"

describe("D08 — Notification impede envio sem destinatário válido", () => {
  it("deve criar notificação DRAFT", () => {
    const notification = Notification.create({
      id: "notif-1",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo da mensagem",
    })

    expect(notification.status.toString()).toBe("DRAFT")
    expect(notification.recipients).toHaveLength(0)
  })

  it("deve adicionar destinatário", () => {
    const notification = Notification.create({
      id: "notif-2",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    const email = EmailAddress.create("user@example.com")
    notification.addRecipient("person-1", email)

    expect(notification.recipients).toHaveLength(1)
  })

  it("deve rejeitar destinatário duplicado", () => {
    const notification = Notification.create({
      id: "notif-3",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    const email = EmailAddress.create("user@example.com")
    notification.addRecipient("person-1", email)

    expect(() => notification.addRecipient("person-1", email)).toThrow(
      "já adicionado"
    )
  })

  it("deve rejeitar envio quando não há destinatários", () => {
    const notification = Notification.create({
      id: "notif-4",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    expect(() => notification.validateRecipients(new Set(["person-1"]))).toThrow(
      "Destinatário"
    )
  })

  it("deve rejeitar destinatário fora do projeto", () => {
    const notification = Notification.create({
      id: "notif-5",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    const email = EmailAddress.create("outsider@example.com")
    notification.addRecipient("person-99", email)

    expect(() =>
      notification.validateRecipients(new Set(["person-1", "person-2"]))
    ).toThrow("Destinatário inválido")
  })
})

describe("D09 — Notification preserva status por destinatário", () => {
  it("deve confirmar envio com chave de idempotência", () => {
    const notification = Notification.create({
      id: "notif-6",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.confirmSend("key-123")

    expect(notification.status.toString()).toBe("PENDING")
    expect(notification.idempotencyKey).toBe("key-123")
  })

  it("deve marcar como ENVIADA após envio", () => {
    const notification = Notification.create({
      id: "notif-7",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.confirmSend("key-456")
    notification.markSending()
    notification.markSent()

    expect(notification.status.toString()).toBe("SENT")
    expect(notification.sentAt).toBeInstanceOf(Date)
  })

  it("deve marcar como FALHA em caso de erro", () => {
    const notification = Notification.create({
      id: "notif-8",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.confirmSend("key-789")
    notification.markSending()
    notification.markFailed()

    expect(notification.status.toString()).toBe("FAILED")
    expect(notification.canRetry()).toBe(true)
  })

  it("deve permitir cancelamento antes do envio", () => {
    const notification = Notification.create({
      id: "notif-9",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.cancel()

    expect(notification.status.toString()).toBe("CANCELLED")
    expect(notification.status.isTerminal()).toBe(true)
  })

  it("deve rejeitar marcação de enviada antes do envio", () => {
    const notification = Notification.create({
      id: "notif-10",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.confirmSend("key-a")

    expect(() => notification.markSent()).toThrow("não está em envio")
  })

  it("deve rejeitar voltar a pendente depois de enviada", () => {
    const notification = Notification.create({
      id: "notif-11",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.confirmSend("key-b")
    notification.markSending()
    notification.markSent()

    expect(notification.canRetry()).toBe(false)
    expect(() => notification.retryToPending()).toThrow(
      "Apenas notificações falhas"
    )
    expect(() => notification.confirmSend("key-c")).toThrow("SENT")
  })

  it("deve rejeitar cancelamento de notificação enviada", () => {
    const notification = Notification.create({
      id: "notif-12",
      projectId: "proj-1",
      createdBy: "user-1",
      subject: "Teste",
      body: "Corpo",
    })

    notification.confirmSend("key-d")
    notification.markSending()
    notification.markSent()

    expect(() => notification.cancel()).toThrow("não pode ser cancelada")
  })
})
