import { describe, it, expect } from "vitest"
import { SyncCalendarEventUseCase } from "@/application/calendar/sync-calendar-event"
import {
  FakeAuthGateway,
  FakeCalendarEventRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { FakeCalendarGateway } from "./fakes/fake-gateways"
import { makeCalendarEvent, PROJECT_ID } from "./fakes/fixtures"

describe("A11 — UC11 Sincronizar Calendar", () => {
  it("deve sincronizar evento pendente e registrar auditoria", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
    const events = new FakeCalendarEventRepository()
    const event = makeCalendarEvent({
      id: "event-1",
      syncStatus: "PENDING",
      externalEventId: "google-cal-1",
    })
    events.events.push(event)
    const calendar = new FakeCalendarGateway()
    const audit = new FakeAuditPort()

    const useCase = new SyncCalendarEventUseCase(auth, events, calendar, audit)
    const result = await useCase.execute({
      projectId: PROJECT_ID,
      eventId: "event-1",
    })

    expect(result.syncStatus).toBe("SYNCED")
    expect(result.externalEventId).toBe("google-cal-google-cal-1")
    expect(calendar.calls).toHaveLength(1)
    expect(audit.countEventType("CALENDAR_EVENT_SYNCED")).toBe(1)
  })

  it("deve manter evento LOCAL sem chamar o Google", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
    const events = new FakeCalendarEventRepository()
    const event = makeCalendarEvent({ id: "event-1", syncStatus: "LOCAL" })
    events.events.push(event)
    const calendar = new FakeCalendarGateway()

    const useCase = new SyncCalendarEventUseCase(
      auth,
      events,
      calendar,
      new FakeAuditPort()
    )
    const result = await useCase.execute({
      projectId: PROJECT_ID,
      eventId: "event-1",
    })

    expect(result.syncStatus).toBe("LOCAL")
    expect(calendar.calls).toHaveLength(0)
    expect(events.events[0].title).toBe("Reunião principal")
  })

  it("deve marcar FAILED e permitir retry sem perder o evento", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
    const events = new FakeCalendarEventRepository()
    events.events.push(
      makeCalendarEvent({
        id: "event-1",
        syncStatus: "PENDING",
        externalEventId: "google-cal-1",
      })
    )
    const calendar = new FakeCalendarGateway()
    calendar.fail = true

    const useCase = new SyncCalendarEventUseCase(
      auth,
      events,
      calendar,
      new FakeAuditPort()
    )

    const failed = await useCase.execute({
      projectId: PROJECT_ID,
      eventId: "event-1",
    })
    expect(failed.syncStatus).toBe("FAILED")
    expect(failed.errorMessage).toContain("indisponível")

    calendar.fail = false
    const retried = await useCase.execute({
      projectId: PROJECT_ID,
      eventId: "event-1",
    })

    expect(retried.syncStatus).toBe("SYNCED")
    expect(events.events[0].title).toBe("Reunião principal")
  })

  it("deve rejeitar evento que não pertence ao projeto", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
    const events = new FakeCalendarEventRepository()

    const useCase = new SyncCalendarEventUseCase(
      auth,
      events,
      new FakeCalendarGateway(),
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({ projectId: PROJECT_ID, eventId: "event-x" })
    ).rejects.toThrow("não encontrado")
  })
})