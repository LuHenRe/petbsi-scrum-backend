import { NotificationStatus } from "../shared/notification-status"
import { EmailAddress } from "../shared/email-address"
import { InvalidRecipientError } from "../shared/errors"

export interface NotificationRecipientData {
  personId: string
  email: EmailAddress
}

export interface NotificationProps {
  id: string
  projectId: string
  createdBy: string
  provider?: string
  subject: string
  body: string
  status?: string
  idempotencyKey?: string
  sentAt?: Date
  createdAt?: Date
}

export class Notification {
  private _recipients: NotificationRecipientData[] = []

  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private readonly _createdBy: string,
    private _provider: string,
    private _subject: string,
    private _body: string,
    private _status: NotificationStatus,
    private _idempotencyKey: string | null,
    private _sentAt: Date | null,
    private readonly _createdAt: Date
  ) {}

  static create(props: NotificationProps): Notification {
    if (!props.subject.trim()) throw new Error("Assunto é obrigatório")
    if (!props.body.trim()) throw new Error("Corpo da mensagem é obrigatório")
    return new Notification(
      props.id,
      props.projectId,
      props.createdBy,
      props.provider ?? "gmail",
      props.subject,
      props.body,
      NotificationStatus.create(props.status ?? "DRAFT"),
      props.idempotencyKey ?? null,
      props.sentAt ?? null,
      props.createdAt ?? new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get createdBy(): string {
    return this._createdBy
  }

  get provider(): string {
    return this._provider
  }

  get subject(): string {
    return this._subject
  }

  get body(): string {
    return this._body
  }

  get status(): NotificationStatus {
    return this._status
  }

  get idempotencyKey(): string | null {
    return this._idempotencyKey
  }

  get sentAt(): Date | null {
    return this._sentAt ? new Date(this._sentAt) : null
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get recipients(): readonly NotificationRecipientData[] {
    return this._recipients
  }

  addRecipient(personId: string, email: EmailAddress): void {
    const exists = this._recipients.some((r) => r.personId === personId)
    if (exists) {
      throw new Error(`Destinatário "${personId}" já adicionado`)
    }
    this._recipients.push({ personId, email })
  }

  addRecipients(recipients: NotificationRecipientData[]): void {
    for (const r of recipients) {
      this.addRecipient(r.personId, r.email)
    }
  }

  removeRecipient(personId: string): void {
    this._recipients = this._recipients.filter((r) => r.personId !== personId)
  }

  validateRecipients(allowedPersonIds: Set<string>): void {
    if (this._recipients.length === 0) {
      throw new InvalidRecipientError("nenhum destinatário informado")
    }
    for (const recipient of this._recipients) {
      if (!allowedPersonIds.has(recipient.personId)) {
        throw new InvalidRecipientError(recipient.email.toString())
      }
    }
  }

  confirmSend(idempotencyKey: string): void {
    if (this._status.is("SENT") || this._status.is("CANCELLED")) {
      throw new Error(
        `Notificação não pode voltar a pendente a partir de ${this._status.toString()}`
      )
    }
    if (this._status.is("SENDING")) {
      throw new Error("Notificação já está em envio")
    }
    this._status = NotificationStatus.PENDING
    this._idempotencyKey = idempotencyKey
  }

  markSending(): void {
    if (!this._status.canSend()) {
      throw new Error(`Notificação não está pendente: ${this._status.toString()}`)
    }
    this._status = NotificationStatus.SENDING
  }

  markSent(): void {
    if (!this._status.is("SENDING")) {
      throw new Error(
        `Notificação não está em envio: ${this._status.toString()}`
      )
    }
    this._status = NotificationStatus.SENT
    this._sentAt = new Date()
  }

  markFailed(): void {
    if (!this._status.is("SENDING") && !this._status.is("PENDING")) {
      throw new Error(
        `Notificação não pode ser marcada como falha a partir de ${this._status.toString()}`
      )
    }
    this._status = NotificationStatus.FAILED
  }

  cancel(): void {
    if (this._status.is("SENT")) {
      throw new Error("Notificação enviada não pode ser cancelada")
    }
    if (this._status.is("CANCELLED")) {
      throw new Error("Notificação já está cancelada")
    }
    this._status = NotificationStatus.CANCELLED
  }

  canRetry(): boolean {
    return this._status.is("FAILED")
  }

  retryToPending(): void {
    if (!this.canRetry()) {
      throw new Error(
        `Apenas notificações falhas podem ser reenviadas: ${this._status.toString()}`
      )
    }
    this._status = NotificationStatus.PENDING
  }

  loadRecipients(recipients: NotificationRecipientData[]): void {
    this._recipients = recipients
  }
}
