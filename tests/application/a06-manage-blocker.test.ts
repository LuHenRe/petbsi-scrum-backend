import { describe, it, expect } from "vitest"
import { ManageBlockerUseCase } from "@/application/workflow/manage-blocker"
import {
  FakeAuthGateway,
  FakeBacklogItemRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import {
  makeBacklogItem,
  PROJECT_ID,
  COLUMN_DOING,
} from "./fakes/fixtures"

describe("A06 — UC06 Gerenciar bloqueio", () => {
  it("deve abrir bloqueio e mover item para BLOQUEADO", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({
        id: "item-1",
        columnId: COLUMN_DOING,
        status: "EM_PROGRESSO",
      })
    )
    const audit = new FakeAuditPort()

    const useCase = new ManageBlockerUseCase(auth, items, audit)
    const result = await useCase.open({
      projectId: PROJECT_ID,
      itemId: "item-1",
      description: "Falta acesso ao ambiente",
    })

    expect(result.status).toBe("OPEN")
    expect(items.items[0].status.toString()).toBe("BLOQUEADO")
    expect(items.items[0].hasOpenBlockers()).toBe(true)
    expect(audit.countEventType("BLOCKER_OPENED")).toBe(1)
  })

  it("deve resolver bloqueio e retornar item para EM_PROGRESSO", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    const item = makeBacklogItem({
      id: "item-1",
      columnId: COLUMN_DOING,
      status: "EM_PROGRESSO",
    })
    items.items.push(item)

    const useCase = new ManageBlockerUseCase(auth, items, new FakeAuditPort())
    const opened = await useCase.open({
      projectId: PROJECT_ID,
      itemId: "item-1",
      description: "Aguardar resposta",
    })

    const resolved = await useCase.resolve({
      projectId: PROJECT_ID,
      itemId: "item-1",
      blockerId: opened.blockerId,
    })

    expect(resolved.status).toBe("RESOLVED")
    expect(items.items[0].hasOpenBlockers()).toBe(false)
    expect(items.items[0].status.toString()).toBe("EM_PROGRESSO")
  })

  it("deve atualizar a descrição do bloqueio", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({
        id: "item-1",
        columnId: COLUMN_DOING,
        status: "EM_PROGRESSO",
      })
    )
    const audit = new FakeAuditPort()

    const useCase = new ManageBlockerUseCase(auth, items, audit)
    const opened = await useCase.open({
      projectId: PROJECT_ID,
      itemId: "item-1",
      description: "Descrição original",
    })

    const updated = await useCase.update({
      projectId: PROJECT_ID,
      itemId: "item-1",
      blockerId: opened.blockerId,
      description: "Descrição atualizada",
    })

    expect(updated.status).toBe("OPEN")
    expect(items.items[0].blockers[0].description).toBe("Descrição atualizada")
    expect(audit.countEventType("BLOCKER_UPDATED")).toBe(1)
  })

  it("deve rejeitar bloqueio de item inexistente", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()

    const useCase = new ManageBlockerUseCase(auth, items, new FakeAuditPort())
    await expect(
      useCase.open({
        projectId: PROJECT_ID,
        itemId: "item-inexistente",
        description: "Descrever bloqueio",
      })
    ).rejects.toThrow("não encontrado")
  })
})