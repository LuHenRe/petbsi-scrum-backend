import { describe, it, expect } from "vitest"
import { GetProjectOverviewUseCase } from "@/application/overview/get-project-overview"
import {
  FakeAuthGateway,
  FakeProjectRepository,
  FakeSprintRepository,
  FakeBacklogItemRepository,
  FakeWorkflowColumnRepository,
  FakeDeliveryRepository,
  makeBlocker,
} from "./fakes/fake-repositories"
import {
  makeProject,
  makeBacklogItem,
  makeColumn,
  makeSprint,
  makeDelivery,
  PROJECT_ID,
  COLUMN_BACKLOG,
  COLUMN_DOING,
  COLUMN_DONE,
} from "./fakes/fixtures"

describe("A02 — UC02 Consultar visão geral", () => {
  it("deve exibir visão completa com Sprint, colunas, bloqueios e entregas", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")

    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())

    const sprints = new FakeSprintRepository()
    sprints.sprints.push(
      makeSprint({ status: "ACTIVE", goal: "Meta vigente" })
    )

    const items = new FakeBacklogItemRepository()
    const doing = makeBacklogItem({
      id: "item-1",
      columnId: COLUMN_DOING,
      status: "EM_PROGRESSO",
      title: "Implementar login",
    })
    doing.registerBlocker(makeBlocker("item-1", "Dependência de infra"))
    const backlog = makeBacklogItem({
      id: "item-2",
      columnId: COLUMN_BACKLOG,
      status: "BACKLOG",
      title: "Revisar requisitos",
    })
    items.items.push(doing, backlog)

    const columns = new FakeWorkflowColumnRepository()
    columns.columns.push(
      makeColumn({ id: COLUMN_BACKLOG, name: "Backlog", orderIndex: 0 }),
      makeColumn({
        id: COLUMN_DOING,
        name: "Em Andamento",
        orderIndex: 1,
        wipLimit: 3,
      }),
      makeColumn({ id: COLUMN_DONE, name: "Concluído", orderIndex: 2 })
    )

    const deliveries = new FakeDeliveryRepository()
    const done = makeDelivery({
      title: "Entrega 1",
      status: "COMPLETED",
      completedOn: new Date("2026-09-05"),
    })
    deliveries.deliveries.push(done, makeDelivery({ title: "Planejada" }))

    const useCase = new GetProjectOverviewUseCase(
      auth,
      projects,
      sprints,
      items,
      columns,
      deliveries
    )

    const overview = await useCase.execute(PROJECT_ID)

    expect(overview.projectName).toBe("Sistema PET")
    expect(overview.currentSprint?.goal).toBe("Meta vigente")
    expect(overview.columns).toHaveLength(3)
    expect(overview.openBlockers).toBe(1)
    expect(overview.backlogItems).toHaveLength(2)
    expect(overview.recentDeliveries).toHaveLength(2)
    const doingColumn = overview.columns.find((c) => c.id === COLUMN_DOING)
    expect(doingColumn?.itemCount).toBe(1)
    expect(doingColumn?.wipLimit).toBe(3)
    expect(doingColumn?.isFull).toBe(false)
  })

  it("deve exibir estado vazio", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())

    const useCase = new GetProjectOverviewUseCase(
      auth,
      projects,
      new FakeSprintRepository(),
      new FakeBacklogItemRepository(),
      new FakeWorkflowColumnRepository(),
      new FakeDeliveryRepository()
    )

    const overview = await useCase.execute(PROJECT_ID)

    expect(overview.currentSprint).toBeNull()
    expect(overview.columns).toEqual([])
    expect(overview.backlogItems).toEqual([])
    expect(overview.openBlockers).toBe(0)
    expect(overview.recentDeliveries).toEqual([])
  })

  it("deve negar acesso sem vínculo com o projeto", async () => {
    const auth = new FakeAuthGateway()
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())

    const useCase = new GetProjectOverviewUseCase(
      auth,
      projects,
      new FakeSprintRepository(),
      new FakeBacklogItemRepository(),
      new FakeWorkflowColumnRepository(),
      new FakeDeliveryRepository()
    )

    await expect(useCase.execute(PROJECT_ID)).rejects.toThrow("sem vínculo")
  })
})