import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  NotificationRepository,
  AuditPort,
} from "../ports/repositories"
import { EmailGateway } from "../ports/email-gateway"
import { Notification } from "@/domain/integration/notification"
import { EmailAddress } from "@/domain/shared/email-address"
import { InvalidRecipientError } from "@/domain/shared/errors"

export interface SendNotificationInput {
  projectId: string
  subject: string
  body: string
  recipientPersonIds: string[]
  idempotencyKey?: string
}

export interface NotificationResult {
  notificationId: string
  status: string
  sentAt: string | null
  errorMessage: string | null
}

export class SendNotificationUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly notificationRepository: NotificationRepository,
    private readonly emailGateway: EmailGateway,
    private readonly auditPort: AuditPort
  ) {}

  async execute(input: SendNotificationInput): Promise<NotificationResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["COORDINATOR", "SCRUM_MASTER"]
    )

    const idempotencyKey = input.idempotencyKey ?? randomUUID()

    const existing = await this.notificationRepository.findByIdempotencyKey(
      idempotencyKey
    )
    if (existing && existing.status.is("SENT")) {
      return {
        notificationId: existing.id,
        status: existing.status.toString(),
        sentAt: existing.sentAt?.toISOString() ?? null,
        errorMessage: null,
      }
    }

    let notification: Notification
    if (existing) {
      notification = existing
      if (notification.status.is("FAILED")) {
        notification.retryToPending()
        await this.notificationRepository.save(notification)
      }
    } else {
      const recipients = await this.notificationRepository.findRecipientsByProject(
        input.projectId,
        input.recipientPersonIds
      )

      if (recipients.length === 0) {
        throw new Error("Nenhum destinatário válido encontrado no projeto")
      }

      const missing = input.recipientPersonIds.filter(
        (id) => !recipients.some((r) => r.personId === id)
      )
      if (missing.length > 0) {
        throw new InvalidRecipientError(missing.join(", "))
      }

      notification = Notification.create({
        id: randomUUID(),
        projectId: input.projectId,
        createdBy: context.user.personId,
        subject: input.subject,
        body: input.body,
      })

      notification.addRecipients(
        recipients.map((r) => ({
          personId: r.personId,
          email: EmailAddress.create(r.email),
        }))
      )

      notification.confirmSend(idempotencyKey)

      await this.notificationRepository.save(notification)
    }

    try {
      notification.markSending()

      const result = await this.emailGateway.send({
        to: notification.recipients.map((r) => r.email.toString()),
        subject: notification.subject,
        body: notification.body,
        providerReference: idempotencyKey,
      })

      if (result.success) {
        notification.markSent()
        await this.notificationRepository.save(notification)

        await this.auditPort.record(context.user.personId, input.projectId, {
          eventType: "NOTIFICATION_SENT",
          aggregateType: "Notification",
          aggregateId: notification.id,
          metadata: {
            recipientCount: notification.recipients.length,
            providerMessageId: result.providerMessageId,
          },
        })

        return {
          notificationId: notification.id,
          status: "SENT",
          sentAt: notification.sentAt?.toISOString() ?? null,
          errorMessage: null,
        }
      }

      notification.markFailed()
      await this.notificationRepository.save(notification)

      await this.auditPort.record(context.user.personId, input.projectId, {
        eventType: "NOTIFICATION_FAILED",
        aggregateType: "Notification",
        aggregateId: notification.id,
        metadata: { errorMessage: result.errorMessage },
      })

      return {
        notificationId: notification.id,
        status: "FAILED",
        sentAt: null,
        errorMessage: result.errorMessage,
      }
    } catch (error) {
      if (!notification.status.is("SENDING") && !notification.status.is("PENDING")) {
        throw error
      }

      notification.markFailed()
      await this.notificationRepository.save(notification)

      const message =
        error instanceof Error ? error.message : "Falha no envio do e-mail"

      await this.auditPort.record(context.user.personId, input.projectId, {
        eventType: "NOTIFICATION_FAILED",
        aggregateType: "Notification",
        aggregateId: notification.id,
        metadata: { errorMessage: message },
      })

      return {
        notificationId: notification.id,
        status: "FAILED",
        sentAt: null,
        errorMessage: message,
      }
    }
  }
}