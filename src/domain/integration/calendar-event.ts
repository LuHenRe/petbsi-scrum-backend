import { SyncStatus } from "../shared/sync-status"
import { MeetingType } from "../shared/meeting-type"

export interface CalendarEventProps {
  id: string
  projectId: string
  deadlineId?: string
  externalEventId?: string
  eventType: string
  title: string
  startsAt: Date
  endsAt: Date
  syncStatus?: string
  lastSyncedAt?: Date
}

export class CalendarEvent {
  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _deadlineId: string | null,
    private _externalEventId: string | null,
    private _eventType: MeetingType,
    private _title: string,
    private _startsAt: Date,
    private _endsAt: Date,
    private _syncStatus: SyncStatus,
    private _lastSyncedAt: Date | null
  ) {}

  static create(props: CalendarEventProps): CalendarEvent {
    if (!props.title.trim()) throw new Error("Título do evento é obrigatório")
    if (props.startsAt >= props.endsAt) {
      throw new Error("Início do evento deve ser anterior ao fim")
    }
    return new CalendarEvent(
      props.id,
      props.projectId,
      props.deadlineId ?? null,
      props.externalEventId ?? null,
      MeetingType.create(props.eventType),
      props.title,
      props.startsAt,
      props.endsAt,
      SyncStatus.create(props.syncStatus ?? "LOCAL"),
      props.lastSyncedAt ?? null
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get deadlineId(): string | null {
    return this._deadlineId
  }

  get externalEventId(): string | null {
    return this._externalEventId
  }

  get eventType(): MeetingType {
    return this._eventType
  }

  get title(): string {
    return this._title
  }

  get startsAt(): Date {
    return new Date(this._startsAt)
  }

  get endsAt(): Date {
    return new Date(this._endsAt)
  }

  get syncStatus(): SyncStatus {
    return this._syncStatus
  }

  get lastSyncedAt(): Date | null {
    return this._lastSyncedAt ? new Date(this._lastSyncedAt) : null
  }

  enableSync(externalEventId: string): void {
    this._syncStatus = SyncStatus.PENDING
    this._externalEventId = externalEventId
  }

  markSynced(externalEventId: string): void {
    this._syncStatus = SyncStatus.SYNCED
    this._externalEventId = externalEventId
    this._lastSyncedAt = new Date()
  }

  markSyncFailed(): void {
    this._syncStatus = SyncStatus.FAILED
  }

  disableSync(): void {
    this._syncStatus = SyncStatus.DISABLED
  }

  revoke(): void {
    this._syncStatus = SyncStatus.REVOKED
  }

  canSync(): boolean {
    return this._syncStatus.canSync()
  }

  updateTimes(startsAt: Date, endsAt: Date): void {
    if (startsAt >= endsAt) {
      throw new Error("Início deve ser anterior ao fim")
    }
    this._startsAt = startsAt
    this._endsAt = endsAt
  }

  updateTitle(title: string): void {
    if (!title.trim()) throw new Error("Título é obrigatório")
    this._title = title
  }
}
