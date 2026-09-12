import { describe, it, expect } from "vitest"
import { ManageBacklogUseCase } from "@/application/backlog/manage-backlog"
import {
  FakeAuthGateway,
  FakeProjectRepository,
  FakeBacklogItemRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { makeBacklogItem, makeProject, PROJECT_ID, COLUMN_BACKLOG } from "./fakes/fixtures"

describe("A03 — UC03 Gerenciar Product Backlog", () => {
  it("deve criar item no backlog e registrar auditoria", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())
    const items = new FakeBacklogItemRepository()
    const audit = new FakeAuditPort()

    const useCase = new ManageBacklogUseCase(auth, projects, items, audit)
    const result = await useCase.create({
      projectId: PROJECT_ID,
      frontId: "front-1",
      columnId: COLUMN_BACKLOG,
      title: "Novo item",
      description: "Descrição",
      priority: "HIGH",
    })

    expect(result.title).toBe("Novo item")
    expect(result.priority).toBe("HIGH")
    expect(items.items).toHaveLength(1)
    expect(audit.countEventType("BACKLOG_ITEM_CREATED")).toBe(1)
  })

  it("deve rejeitar criação com título vazio", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())
    const audit = new FakeAuditPort()

    const useCase = new ManageBacklogUseCase(
      auth,
      projects,
      new FakeBacklogItemRepository(),
      audit
    )

    await expect(
      useCase.create({
        projectId: PROJECT_ID,
        frontId: "front-1",
        columnId: COLUMN_BACKLOG,
        title: "  ",
      })
    ).rejects.toThrow("Título do item é obrigatório")
  })

  it("deve editar título, prioridade e responsável", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))

    const useCase = new ManageBacklogUseCase(auth, projects, items, new FakeAuditPort())
    const result = await useCase.update({
      itemId: "item-1",
      projectId: PROJECT_ID,
      title: "Título novo",
      priority: "CRITICAL",
      assigneeId: "person-2",
    })

    expect(result.title).toBe("Título novo")
    expect(result.priority).toBe("CRITICAL")
    expect(items.items[0].assigneeId).toBe("person-2")
  })

  it("deve reordenar itens", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "PRODUCT_OWNER")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({ id: "item-a", orderIndex: 0 }),
      makeBacklogItem({ id: "item-b", orderIndex: 1 }),
      makeBacklogItem({ id: "item-c", orderIndex: 2 })
    )

    const useCase = new ManageBacklogUseCase(auth, projects, items, new FakeAuditPort())
    await useCase.reorder({
      projectId: PROJECT_ID,
      itemIds: ["item-a", "item-c", "item-b"],
    })

    const byId = new Map(items.items.map((i) => [i.id, i]))
    expect(byId.get("item-a")?.orderIndex).toBe(0)
    expect(byId.get("item-c")?.orderIndex).toBe(1)
    expect(byId.get("item-b")?.orderIndex).toBe(2)
  })

  it("deve negar criação para papel sem permissão", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())

    const useCase = new ManageBacklogUseCase(
      auth,
      projects,
      new FakeBacklogItemRepository(),
      new FakeAuditPort()
    )

    await expect(
      useCase.create({
        projectId: PROJECT_ID,
        frontId: "front-1",
        columnId: COLUMN_BACKLOG,
        title: "Item",
      })
    ).rejects.toThrow("sem permissão")
  })
})