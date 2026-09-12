import { describe, it, expect } from "vitest"
import { PlanSprintUseCase } from "@/application/sprint/plan-sprint"
import {
  FakeAuthGateway,
  FakeSprintRepository,
  FakeBacklogItemRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { makeBacklogItem, makeSprint, PROJECT_ID } from "./fakes/fixtures"

describe("A04 — UC04 Planejar Sprint", () => {
  it("deve criar Sprint e selecionar itens com meta", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const sprints = new FakeSprintRepository()
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({ id: "item-1", status: "SELECIONADO" }),
      makeBacklogItem({ id: "item-2", status: "SELECIONADO" })
    )

    const useCase = new PlanSprintUseCase(
      auth,
      sprints,
      items,
      new FakeAuditPort()
    )

    const created = await useCase.create({
      projectId: PROJECT_ID,
      goal: "Meta inicial",
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2026-09-14"),
    })

    const planned = await useCase.plan({
      sprintId: created.id,
      projectId: PROJECT_ID,
      goal: "Meta planejada",
      itemIdsToAdd: ["item-1", "item-2"],
    })

    expect(planned.goal).toBe("Meta planejada")
    const stored = await sprints.findById(created.id)
    expect(stored?.itemIds.has("item-1")).toBe(true)
    expect(stored?.itemIds.has("item-2")).toBe(true)
  })

  it("deve rejeitar item duplicado na mesma Sprint", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")
    const sprints = new FakeSprintRepository()
    sprints.sprints.push(makeSprint({ id: "sprint-1" }))
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))

    const useCase = new PlanSprintUseCase(
      auth,
      sprints,
      items,
      new FakeAuditPort()
    )

    await useCase.plan({
      sprintId: "sprint-1",
      projectId: PROJECT_ID,
      itemIdsToAdd: ["item-1"],
    })

    await expect(
      useCase.plan({
        sprintId: "sprint-1",
        projectId: PROJECT_ID,
        itemIdsToAdd: ["item-1"],
      })
    ).rejects.toThrow("já está nesta Sprint")
  })

  it("deve rejeitar planejamento de Sprint encerrada", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const sprints = new FakeSprintRepository()
    sprints.sprints.push(makeSprint({ id: "sprint-1", status: "CLOSED" }))

    const useCase = new PlanSprintUseCase(
      auth,
      sprints,
      new FakeBacklogItemRepository(),
      new FakeAuditPort()
    )

    await expect(
      useCase.plan({
        sprintId: "sprint-1",
        projectId: PROJECT_ID,
        itemIdsToAdd: ["item-1"],
      })
    ).rejects.toThrow("Sprint encerrada")
  })

  it("deve impedir duas Sprints ativas no mesmo projeto", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const sprints = new FakeSprintRepository()
    sprints.sprints.push(makeSprint({ id: "sprint-active", status: "ACTIVE" }))

    const useCase = new PlanSprintUseCase(
      auth,
      sprints,
      new FakeBacklogItemRepository(),
      new FakeAuditPort()
    )

    await expect(
      useCase.create({
        projectId: PROJECT_ID,
        goal: "Nova meta",
        startsOn: new Date("2026-09-15"),
        endsOn: new Date("2026-09-28"),
      })
    ).rejects.toThrow("Sprint ativa")
  })

  it("finaliza o planejamento, inicia a Sprint e rejeita close antecipado", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")
    const sprints = new FakeSprintRepository()
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))

    const useCase = new PlanSprintUseCase(
      auth,
      sprints,
      items,
      new FakeAuditPort()
    )

    const created = await useCase.create({
      projectId: PROJECT_ID,
      goal: "Meta inicial",
      startsOn: new Date("2026-09-01"),
      endsOn: new Date("2026-09-14"),
    })

    await useCase.plan({
      sprintId: created.id,
      projectId: PROJECT_ID,
      itemIdsToAdd: ["item-1"],
      finalizePlanning: true,
    })

    const planned = await sprints.findById(created.id)
    expect(planned?.status.toString()).toBe("PLANNED")

    await expect(
      useCase.close({ sprintId: created.id, projectId: PROJECT_ID })
    ).rejects.toThrow("Transição inválida")

    await useCase.start({ sprintId: created.id, projectId: PROJECT_ID })

    const active = await sprints.findById(created.id)
    expect(active?.status.toString()).toBe("ACTIVE")
  })
})