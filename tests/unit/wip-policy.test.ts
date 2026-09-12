import { describe, it, expect } from "vitest"
import { WorkflowColumn } from "@/domain/workflow/workflow-column"
import { WipPolicy } from "@/domain/workflow/wip-policy"

describe("D03 — WorkflowColumn/WipPolicy rejeita entrada quando WIP está cheio", () => {
  it("deve permitir entrada quando não há limite de WIP", () => {
    const column = WorkflowColumn.create({
      id: "col-1",
      projectId: "proj-1",
      name: "Em progresso",
      wipLimit: null,
      orderIndex: 1,
    })

    expect(() => WipPolicy.validateMove(column, 10)).not.toThrow()
  })

  it("deve permitir entrada quando WIP não está no limite", () => {
    const column = WorkflowColumn.create({
      id: "col-2",
      projectId: "proj-1",
      name: "Em revisão",
      wipLimit: 3,
      orderIndex: 2,
    })

    expect(() => WipPolicy.validateMove(column, 2)).not.toThrow()
  })

  it("deve rejeitar entrada quando WIP está no limite", () => {
    const column = WorkflowColumn.create({
      id: "col-3",
      projectId: "proj-1",
      name: "Em revisão",
      wipLimit: 3,
      orderIndex: 2,
    })

    expect(() => WipPolicy.validateMove(column, 3)).toThrow("Limite WIP")
  })

  it("deve rejeitar entrada quando WIP está acima do limite", () => {
    const column = WorkflowColumn.create({
      id: "col-4",
      projectId: "proj-1",
      name: "Em revisão",
      wipLimit: 2,
      orderIndex: 2,
    })

    expect(() => WipPolicy.validateMove(column, 5)).toThrow("Limite WIP")
  })

  it("deve reportar utilização corretamente", () => {
    const column = WorkflowColumn.create({
      id: "col-5",
      projectId: "proj-1",
      name: "Em progresso",
      wipLimit: 4,
      orderIndex: 1,
    })

    const util = WipPolicy.getColumnUtilization(column, 3)
    expect(util.count).toBe(3)
    expect(util.limit).toBe(4)
    expect(util.isFull).toBe(false)
  })

  it("deve reportar isFull quando no limite", () => {
    const column = WorkflowColumn.create({
      id: "col-6",
      projectId: "proj-1",
      name: "Em progresso",
      wipLimit: 3,
      orderIndex: 1,
    })

    const util = WipPolicy.getColumnUtilization(column, 3)
    expect(util.isFull).toBe(true)
  })

  it("deve rejeitar entrada quando WIP é zero (coluna sem capacidade)", () => {
    const column = WorkflowColumn.create({
      id: "col-zero",
      projectId: "proj-1",
      name: "Inativa",
      wipLimit: 0,
      orderIndex: 1,
    })

    expect(() => WipPolicy.validateMove(column, 0)).toThrow("Limite WIP")
    expect(WipPolicy.getColumnUtilization(column, 0).isFull).toBe(true)
  })
})
