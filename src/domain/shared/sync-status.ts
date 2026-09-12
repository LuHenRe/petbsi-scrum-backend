const VALID_STATUSES = [
  "LOCAL",
  "DISABLED",
  "PENDING",
  "SYNCED",
  "FAILED",
  "REVOKED",
] as const

export type SyncStatusValue = (typeof VALID_STATUSES)[number]

export class SyncStatus {
  private constructor(private readonly value: SyncStatusValue) {}

  static create(value: string): SyncStatus {
    const normalized = value.toUpperCase() as SyncStatusValue
    if (!VALID_STATUSES.includes(normalized)) {
      throw new Error(`SyncStatus inválido: "${value}"`)
    }
    return new SyncStatus(normalized)
  }

  static readonly DISABLED = new SyncStatus("DISABLED")
  static readonly PENDING = new SyncStatus("PENDING")
  static readonly SYNCED = new SyncStatus("SYNCED")
  static readonly FAILED = new SyncStatus("FAILED")
  static readonly REVOKED = new SyncStatus("REVOKED")

  canSync(): boolean {
    return this.value === "PENDING" || this.value === "FAILED"
  }

  is(value: SyncStatusValue): boolean {
    return this.value === value
  }

  get isLocal(): boolean {
    return this.value === "LOCAL"
  }

  equals(other: SyncStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): SyncStatusValue {
    return this.value
  }
}
