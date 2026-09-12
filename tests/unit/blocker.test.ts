import { describe, it, expect } from "vitest"
import { Blocker } from "@/domain/blocker/blocker"
import { BacklogItem } from "@/domain/backlog/backlog-item"

describe("D04 — Blocker abre e resolve impedimento corretamente", () => {
  it("deve criar bloqueio aberto", () => {
    const blocker = Blocker.create({
      id: "blocker-1",
      backlogItemId: "item-1",
      reportedBy: "user-1",
      description: "Aguardando revisão",
    })

    expect(blocker.isOpen()).toBe(true)
    expect(blocker.status).toBe("OPEN")
    expect(blocker.resolvedBy).toBeNull()
    expect(blocker.resolvedAt).toBeNull()
  })

  it("deve resolver bloqueio", () => {
    const blocker = Blocker.create({
      id: "blocker-2",
      backlogItemId: "item-1",
      reportedBy: "user-1",
      description: "Aguardando revisão",
    })

    blocker.resolve("user-2")

    expect(blocker.isOpen()).toBe(false)
    expect(blocker.status).toBe("RESOLVED")
    expect(blocker.resolvedBy).toBe("user-2")
    expect(blocker.resolvedAt).toBeInstanceOf(Date)
  })

  it("deve rejeitar resolução de bloqueio já resolvido", () => {
    const blocker = Blocker.create({
      id: "blocker-3",
      backlogItemId: "item-1",
      reportedBy: "user-1",
      description: "Bloqueio resolvido",
      status: "RESOLVED",
    })

    expect(() => blocker.resolve("user-2")).toThrow("já foi resolvido")
  })

  it("deve registrar bloqueio no item e atualizar lista de abertos", () => {
    const item = BacklogItem.create({
      id: "item-1",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item com bloqueio",
      status: "EM_PROGRESSO",
    })

    const blocker = Blocker.create({
      id: "blocker-4",
      backlogItemId: "item-1",
      reportedBy: "user-1",
      description: "Impedimento",
    })

    item.registerBlocker(blocker)

    expect(item.hasOpenBlockers()).toBe(true)
    expect(item.openBlockers).toHaveLength(1)
  })

  it("deve remover bloqueio da lista de abertos ao resolver", () => {
    const item = BacklogItem.create({
      id: "item-2",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item com bloqueio resolvido",
      status: "EM_PROGRESSO",
    })

    const blocker = Blocker.create({
      id: "blocker-5",
      backlogItemId: "item-2",
      reportedBy: "user-1",
      description: "Impedimento",
    })

    item.registerBlocker(blocker)
    item.resolveBlocker("blocker-5", "user-2")

    expect(item.hasOpenBlockers()).toBe(false)
    expect(item.openBlockers).toHaveLength(0)
  })
})
