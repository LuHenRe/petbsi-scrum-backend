const VALID_STATUSES = [
  "DRAFT",
  "PENDING",
  "SENDING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const

export type NotificationStatusValue = (typeof VALID_STATUSES)[number]

export class NotificationStatus {
  private constructor(private readonly value: NotificationStatusValue) {}

  static create(value: string): NotificationStatus {
    const normalized = value.toUpperCase() as NotificationStatusValue
    if (!VALID_STATUSES.includes(normalized)) {
      throw new Error(`NotificationStatus inválido: "${value}"`)
    }
    return new NotificationStatus(normalized)
  }

  static readonly DRAFT = new NotificationStatus("DRAFT")
  static readonly PENDING = new NotificationStatus("PENDING")
  static readonly SENDING = new NotificationStatus("SENDING")
  static readonly SENT = new NotificationStatus("SENT")
  static readonly FAILED = new NotificationStatus("FAILED")
  static readonly CANCELLED = new NotificationStatus("CANCELLED")

  canSend(): boolean {
    return this.value === "PENDING"
  }

  is(value: NotificationStatusValue): boolean {
    return this.value === value
  }

  isTerminal(): boolean {
    return this.value === "SENT" || this.value === "CANCELLED"
  }

  equals(other: NotificationStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): NotificationStatusValue {
    return this.value
  }
}
