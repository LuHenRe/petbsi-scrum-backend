import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  CalendarEventRepository,
  AuditPort,
} from "../ports/repositories"
import { CalendarEvent } from "@/domain/integration/calendar-event"

export interface ConfigureReminderInput {
  projectId: string
  eventType: string
  title: string
  startsAt: Date
  endsAt: Date
}

export interface ConfigureReminderResult {
  eventId: string
  title: string
  eventType: string
  startsAt: string
  endsAt: string
  syncStatus: string
}

export class ConfigureReminderUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly auditPort: AuditPort
  ) {}

  async execute(input: ConfigureReminderInput): Promise<ConfigureReminderResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["COORDINATOR", "SCRUM_MASTER"]
    )

    const event = CalendarEvent.create({
      id: randomUUID(),
      projectId: input.projectId,
      eventType: input.eventType,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    })

    await this.calendarEventRepository.save(event)

    await this.auditPort.record(context.user.personId, input.projectId, {
      eventType: "REMINDER_CONFIGURED",
      aggregateType: "CalendarEvent",
      aggregateId: event.id,
      metadata: {
        title: event.title,
        eventType: event.eventType.toString(),
      },
    })

    return {
      eventId: event.id,
      title: event.title,
      eventType: event.eventType.toString(),
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      syncStatus: event.syncStatus.toString(),
    }
  }
}