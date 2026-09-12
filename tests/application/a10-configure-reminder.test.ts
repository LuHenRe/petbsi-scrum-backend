import { describe, it, expect } from "vitest"
import { ConfigureReminderUseCase } from "@/application/calendar/configure-reminder"
import {
  FakeAuthGateway,
  FakeCalendarEventRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { PROJECT_ID } from "./fakes/fixtures"

describe("A10 — UC10 Configurar lembrete", () => {
  const validInput = {
    projectId: PROJECT_ID,
    eventType: "WEDNESDAY_MAIN_MEETING",
    title: "Reunião principal",
    startsAt: new Date("2026-09-10T08:00:00"),
    endsAt: new Date("2026-09-10T10:00:00"),
  }

  it("deve criar evento local com datas válidas", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")
    const events = new FakeCalendarEventRepository()
    const audit = new FakeAuditPort()

    const useCase = new ConfigureReminderUseCase(auth, events, audit)
    const result = await useCase.execute(validInput)

    expect(result.syncStatus).toBe("LOCAL")
    expect(result.eventType).toBe("WEDNESDAY_MAIN_MEETING")
    expect(events.events).toHaveLength(1)
    expect(audit.countEventType("REMINDER_CONFIGURED")).toBe(1)
  })

  it("deve rejeitar data invertida", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")

    const useCase = new ConfigureReminderUseCase(
      auth,
      new FakeCalendarEventRepository(),
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({
        ...validInput,
        startsAt: new Date("2026-09-10T12:00:00"),
        endsAt: new Date("2026-09-10T08:00:00"),
      })
    ).rejects.toThrow("anterior ao fim")
  })

  it("deve rejeitar tipo de evento inválido", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")

    const useCase = new ConfigureReminderUseCase(
      auth,
      new FakeCalendarEventRepository(),
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({ ...validInput, eventType: "FOO_BAR" })
    ).rejects.toThrow("Tipo de reunião inválido")
  })

  it("deve negar papel sem permissão", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")

    const useCase = new ConfigureReminderUseCase(
      auth,
      new FakeCalendarEventRepository(),
      new FakeAuditPort()
    )

    await expect(useCase.execute(validInput)).rejects.toThrow("sem permissão")
  })
})