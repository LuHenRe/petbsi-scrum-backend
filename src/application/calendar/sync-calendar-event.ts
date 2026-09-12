import { AuthGateway } from "../ports/auth-gateway"
import {
  CalendarEventRepository,
  AuditPort,
} from "../ports/repositories"
import { CalendarGateway } from "../ports/calendar-gateway"

export interface SyncCalendarEventInput {
  projectId: string
  eventId: string
}

export interface SyncCalendarEventResult {
  eventId: string
  externalEventId: string | null
  syncStatus: string
  errorMessage: string | null
}

export class SyncCalendarEventUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly calendarGateway: CalendarGateway,
    private readonly auditPort: AuditPort
  ) {}

  async execute(input: SyncCalendarEventInput): Promise<SyncCalendarEventResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["COORDINATOR", "SCRUM_MASTER"]
    )

    const event = await this.calendarEventRepository.findById(input.eventId)
    if (!event || event.projectId !== input.projectId) {
      throw new Error("Evento não encontrado no projeto")
    }

    if (!event.canSync()) {
      return {
        eventId: event.id,
        externalEventId: event.externalEventId,
        syncStatus: event.syncStatus.toString(),
        errorMessage: null,
      }
    }

    try {
      const reference = await this.calendarGateway.createOrUpdate({
        idempotencyKey: event.externalEventId ?? event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      })

      event.markSynced(reference.externalEventId)
      await this.calendarEventRepository.save(event)

      await this.auditPort.record(context.user.personId, input.projectId, {
        eventType: "CALENDAR_EVENT_SYNCED",
        aggregateType: "CalendarEvent",
        aggregateId: event.id,
        metadata: { externalEventId: reference.externalEventId },
      })

      return {
        eventId: event.id,
        externalEventId: reference.externalEventId,
        syncStatus: event.syncStatus.toString(),
        errorMessage: null,
      }
    } catch (error) {
      event.markSyncFailed()
      await this.calendarEventRepository.save(event)

      const message =
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar evento no Google Calendar"

      await this.auditPort.record(context.user.personId, input.projectId, {
        eventType: "CALENDAR_EVENT_SYNC_FAILED",
        aggregateType: "CalendarEvent",
        aggregateId: event.id,
        metadata: { errorMessage: message },
      })

      return {
        eventId: event.id,
        externalEventId: event.externalEventId,
        syncStatus: event.syncStatus.toString(),
        errorMessage: message,
      }
    }
  }
}