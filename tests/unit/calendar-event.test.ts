import { describe, it, expect } from "vitest"
import { CalendarEvent } from "@/domain/integration/calendar-event"

function makeCalendarEvent(overrides?: { syncStatus?: string }): CalendarEvent {
  return CalendarEvent.create({
    id: "event-1",
    projectId: "proj-1",
    eventType: "WEDNESDAY_MAIN_MEETING",
    title: "Reunião principal",
    startsAt: new Date("2026-09-10T08:00:00"),
    endsAt: new Date("2026-09-10T10:00:00"),
    syncStatus: overrides?.syncStatus ?? "LOCAL",
  })
}

describe("D10 — CalendarEvent permanece válido no modo somente local", () => {
  it("deve criar evento local sem Google", () => {
    const event = makeCalendarEvent()

    expect(event.externalEventId).toBeNull()
    expect(event.syncStatus.toString()).toBe("LOCAL")
    expect(event.title).toBe("Reunião principal")
  })

  it("deve permanecer válido mesmo sem sincronização", () => {
    const event = makeCalendarEvent()
    expect(event.canSync()).toBe(false)
  })

  it("deve habilitar sincronização", () => {
    const event = makeCalendarEvent()
    event.enableSync("google-event-123")

    expect(event.syncStatus.toString()).toBe("PENDING")
    expect(event.externalEventId).toBe("google-event-123")
  })

  it("deve marcar como sincronizado", () => {
    const event = makeCalendarEvent()
    event.enableSync("google-event-456")
    event.markSynced("google-event-456")

    expect(event.syncStatus.toString()).toBe("SYNCED")
    expect(event.lastSyncedAt).toBeInstanceOf(Date)
  })

  it("deve marcar falha sem perder evento local", () => {
    const event = makeCalendarEvent()
    event.enableSync("google-event-789")
    event.markSyncFailed()

    expect(event.syncStatus.toString()).toBe("FAILED")
    expect(event.title).toBe("Reunião principal")
  })

  it("deve desabilitar sincronização preservando evento", () => {
    const event = makeCalendarEvent()
    event.enableSync("google-event-abc")
    event.disableSync()

    expect(event.syncStatus.toString()).toBe("DISABLED")
    expect(event.title).toBe("Reunião principal")
  })

  it("deve rejeitar criação com título vazio", () => {
    expect(() =>
      CalendarEvent.create({
        id: "event-2",
        projectId: "proj-1",
        eventType: "CUSTOM",
        title: "",
        startsAt: new Date("2026-09-10T08:00:00"),
        endsAt: new Date("2026-09-10T10:00:00"),
      })
    ).toThrow("Título do evento é obrigatório")
  })

  it("deve rejeitar criação com início após fim", () => {
    expect(() =>
      CalendarEvent.create({
        id: "event-3",
        projectId: "proj-1",
        eventType: "CUSTOM",
        title: "Evento",
        startsAt: new Date("2026-09-10T12:00:00"),
        endsAt: new Date("2026-09-10T08:00:00"),
      })
    ).toThrow("anterior ao fim")
  })
})
