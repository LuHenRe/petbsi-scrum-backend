import { describe, it, expect } from "vitest"
import { MoveBacklogItemUseCase } from "@/application/backlog/move-backlog-item"
import {
  FakeAuthGateway,
  FakeBacklogItemRepository,
  FakeWorkflowColumnRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import {
  makeBacklogItem,
  makeColumn,
  PROJECT_ID,
  COLUMN_BACKLOG,
  COLUMN_DOING,
} from "./fakes/fixtures"

describe("A05 — UC05 Atualizar item no fluxo", () => {
  it("deve mover item válido para outra coluna registrando histórico", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({ id: "item-1", columnId: COLUMN_BACKLOG })
    )
    const columns = new FakeWorkflowColumnRepository()
    columns.columns.push(
      makeColumn({ id: COLUMN_BACKLOG, name: "Backlog", orderIndex: 0 }),
      makeColumn({ id: COLUMN_DOING, name: "Em Andamento", orderIndex: 1 })
    )
    const audit = new FakeAuditPort()

    const useCase = new MoveBacklogItemUseCase(auth, items, columns, audit)
    const result = await useCase.execute({
      projectId: PROJECT_ID,
      itemId: "item-1",
      toColumnId: COLUMN_DOING,
      reason: "Início da execução",
    })

    expect(result.fromColumnId).toBe(COLUMN_BACKLOG)
    expect(result.toColumnId).toBe(COLUMN_DOING)
    expect(items.items[0].columnId).toBe(COLUMN_DOING)
    expect(items.items[0].stateChanges).toHaveLength(1)
    expect(items.items[0].stateChanges[0].reason).toBe("Início da execução")
    expect(audit.countEventType("BACKLOG_ITEM_MOVED")).toBe(1)
  })

  it("deve rejeitar quando WIP da coluna está cheio e não alterar estado", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({ id: "item-1", columnId: COLUMN_BACKLOG }),
      makeBacklogItem({ id: "item-2", columnId: COLUMN_DOING })
    )
    const columns = new FakeWorkflowColumnRepository()
    columns.columns.push(
      makeColumn({ id: COLUMN_BACKLOG, name: "Backlog", orderIndex: 0 }),
      makeColumn({
        id: COLUMN_DOING,
        name: "Em Andamento",
        orderIndex: 1,
        wipLimit: 1,
      })
    )

    const useCase = new MoveBacklogItemUseCase(
      auth,
      items,
      columns,
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        itemId: "item-1",
        toColumnId: COLUMN_DOING,
      })
    ).rejects.toThrow("Limite WIP")

    expect(items.items[0].columnId).toBe(COLUMN_BACKLOG)
    expect(items.items[0].stateChanges).toHaveLength(0)
  })

  it("deve permitir mover com override de WIP", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({ id: "item-1", columnId: COLUMN_BACKLOG }),
      makeBacklogItem({ id: "item-2", columnId: COLUMN_DOING })
    )
    const columns = new FakeWorkflowColumnRepository()
    columns.columns.push(
      makeColumn({ id: COLUMN_BACKLOG, name: "Backlog", orderIndex: 0 }),
      makeColumn({
        id: COLUMN_DOING,
        name: "Em Andamento",
        orderIndex: 1,
        wipLimit: 1,
      })
    )

    const useCase = new MoveBacklogItemUseCase(
      auth,
      items,
      columns,
      new FakeAuditPort()
    )

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      itemId: "item-1",
      toColumnId: COLUMN_DOING,
      overrideWip: true,
    })

    expect(result.toColumnId).toBe(COLUMN_DOING)
  })

  it("deve negar sem permissão", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "STAKEHOLDER")
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))
    const columns = new FakeWorkflowColumnRepository()
    columns.columns.push(
      makeColumn({ id: COLUMN_BACKLOG, name: "Backlog", orderIndex: 0 })
    )

    const useCase = new MoveBacklogItemUseCase(
      auth,
      items,
      columns,
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        itemId: "item-1",
        toColumnId: COLUMN_DOING,
      })
    ).rejects.toThrow("sem permissão")
  })
})