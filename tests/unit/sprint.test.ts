import { describe, it, expect } from "vitest"
import { Sprint } from "@/domain/sprint/sprint"
import { BacklogItem } from "@/domain/backlog/backlog-item"
import { BacklogPolicy } from "@/domain/backlog/backlog-policy"

function makeSprint(overrides?: { status?: string }): Sprint {
  return Sprint.create({
    id: "sprint-1",
    projectId: "proj-1",
    goal: "Meta de teste",
    startsOn: new Date("2026-09-01"),
    endsOn: new Date("2026-09-14"),
    status: overrides?.status ?? "DRAFT",
  })
}

function makeItem(status?: string): BacklogItem {
  return BacklogItem.create({
    id: `item-${Date.now()}`,
    projectId: "proj-1",
    frontId: "front-1",
    columnId: "col-1",
    title: "Item de teste",
    status,
  })
}

describe("D05 — Sprint exige Meta antes de iniciar", () => {
  it("deve rejeitar criação de Sprint sem goal", () => {
    expect(() =>
      Sprint.create({
        id: "sprint-2",
        projectId: "proj-1",
        goal: "",
        startsOn: new Date("2026-09-01"),
        endsOn: new Date("2026-09-14"),
      })
    ).toThrow("Meta da Sprint é obrigatória")
  })

  it("deve aceitar criação de Sprint com goal", () => {
    const sprint = makeSprint()
    expect(sprint.goal).toBe("Meta de teste")
  })

  it("deve rejeitar meta em branco mesmo em status não terminal", () => {
    const sprint = makeSprint()
    expect(() => sprint.defineGoal("   ")).toThrow("Meta da Sprint é obrigatória")
  })
})

describe("D06 — Sprint seleciona item sem duplicar na mesma Sprint", () => {
  it("deve selecionar item novo", () => {
    const sprint = makeSprint()
    const item = makeItem()

    sprint.selectItem(item)

    expect(sprint.items).toHaveLength(1)
    expect(sprint.itemIds.has(item.id)).toBe(true)
  })

  it("deve rejeitar item duplicado na mesma Sprint", () => {
    const sprint = makeSprint()
    const item = makeItem()

    sprint.selectItem(item)

    expect(() => sprint.selectItem(item)).toThrow("já está nesta Sprint")
  })

  it("deve rejeitar item com status terminal", () => {
    const sprint = makeSprint()
    const item = makeItem("ENTREGUE")

    expect(() => sprint.selectItem(item)).toThrow("status terminal")
  })

  it("deve remover item da Sprint renumerando os índices restantes", () => {
    const sprint = makeSprint()
    const a = BacklogItem.create({
      id: "item-a",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item A",
    })
    const b = BacklogItem.create({
      id: "item-b",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item B",
    })
    const c = BacklogItem.create({
      id: "item-c",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item C",
    })

    sprint.selectItem(a)
    sprint.selectItem(b)
    sprint.selectItem(c)
    sprint.removeItem(b.id)

    expect(sprint.items).toHaveLength(2)
    expect(sprint.itemIds.has(b.id)).toBe(false)
    expect(sprint.items.map((si) => si.orderIndex)).toEqual([0, 1])
  })

  it("deve rejeitar remoção de item inexistente", () => {
    const sprint = makeSprint()
    expect(() => sprint.removeItem("nonexistent")).toThrow("não está nesta Sprint")
  })
})

describe("D07 — Sprint impede duas Sprints ativas no mesmo projeto", () => {
  it("sprint pode iniciar quando não há outra ativa", () => {
    const sprint = makeSprint({ status: "PLANNED" })
    expect(() => sprint.start()).not.toThrow()
    expect(sprint.isActive()).toBe(true)
  })

  it("sprint não pode iniciar de status DRAFT", () => {
    const sprint = makeSprint({ status: "DRAFT" })
    expect(() => sprint.start()).toThrow("Transição inválida")
  })

  it("sprint pode ser cancelada de status não terminal", () => {
    const sprint = makeSprint({ status: "DRAFT" })
    sprint.cancel()
    expect(sprint.status.toString()).toBe("CANCELLED")
    expect(sprint.status.isTerminal()).toBe(true)
  })

  it("sprint terminal não pode ser cancelada", () => {
    const sprint = makeSprint({ status: "CLOSED" })
    expect(() => sprint.cancel()).toThrow("Transição inválida")
  })
})

describe("Sprint — ciclo de vida completo", () => {
  it("promove DRAFT→PLANNING→PLANNED e inicia", () => {
    const sprint = makeSprint()
    sprint.promoteToPlanning()
    expect(sprint.status.toString()).toBe("PLANNING")
    sprint.finalizePlanning()
    expect(sprint.status.toString()).toBe("PLANNED")
    sprint.start()
    expect(sprint.status.toString()).toBe("ACTIVE")
  })

  it("finalizePlanning direto do DRAFT lança erro", () => {
    const sprint = makeSprint()
    expect(() => sprint.finalizePlanning()).toThrow("Transição inválida")
  })

  it("percorre REVIEW e RETROSPECTIVE até CLOSED", () => {
    const sprint = makeSprint({ status: "ACTIVE" })
    sprint.beginReview()
    expect(sprint.status.toString()).toBe("REVIEW")
    sprint.beginRetrospective()
    expect(sprint.status.toString()).toBe("RETROSPECTIVE")
    sprint.close()
    expect(sprint.status.toString()).toBe("CLOSED")
    expect(sprint.status.isTerminal()).toBe(true)
  })

  it("close antes do REVIEW lança erro", () => {
    const sprint = makeSprint({ status: "ACTIVE" })
    expect(() => sprint.close()).toThrow("Transição inválida")
  })

  it("não permite selecionar item após o início", () => {
    const sprint = makeSprint({ status: "PLANNED" })
    sprint.start()
    expect(() => sprint.selectItem(makeItem())).toThrow("Transição inválida")
  })

  it("não permite remover item de Sprint encerrada", () => {
    const sprint = makeSprint({ status: "CLOSED" })
    expect(() => sprint.removeItem("item-x")).toThrow("Transição inválida")
  })

  it("SprintItem.reorder rejeita índice negativo", () => {
    const sprint = makeSprint()
    const item = makeItem()
    sprint.selectItem(item)
    expect(() => sprint.items[0].reorder(-1)).toThrow("ordenação inválido")
  })
})
