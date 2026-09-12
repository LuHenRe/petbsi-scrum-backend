import { describe, it, expect } from "vitest"
import { BacklogItem } from "@/domain/backlog/backlog-item"
import { WorkItemStatus } from "@/domain/shared/work-item-status"
import { Blocker } from "@/domain/blocker/blocker"

describe("D01 — BacklogItem aceita transição permitida", () => {
  it("deve transicionar de BACKLOG para SELECIONADO", () => {
    const item = BacklogItem.create({
      id: "item-1",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item de teste",
    })

    expect(item.status.toString()).toBe("BACKLOG")

    item.transitionTo(WorkItemStatus.SELECIONADO, "user-1")

    expect(item.status.toString()).toBe("SELECIONADO")
  })

  it("deve transicionar de EM_PROGRESSO para EM_REVISAO", () => {
    const item = BacklogItem.create({
      id: "item-2",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-2",
      title: "Item em progresso",
      status: "EM_PROGRESSO",
    })

    item.transitionTo(WorkItemStatus.EM_REVISAO, "user-1")

    expect(item.status.toString()).toBe("EM_REVISAO")
  })

  it("deve transicionar de EM_REVISAO para CONCLUIDO", () => {
    const item = BacklogItem.create({
      id: "item-3",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-3",
      title: "Item revisado",
      status: "EM_REVISAO",
    })

    item.transitionTo(WorkItemStatus.CONCLUIDO, "user-1")

    expect(item.status.toString()).toBe("CONCLUIDO")
  })

  it("deve transicionar de CONCLUIDO para ENTREGUE", () => {
    const item = BacklogItem.create({
      id: "item-4",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-4",
      title: "Item concluído",
      status: "CONCLUIDO",
    })

    item.transitionTo(WorkItemStatus.ENTREGUE, "user-1")

    expect(item.status.toString()).toBe("ENTREGUE")
  })
})

describe("D02 — BacklogItem rejeita transição proibida", () => {
  it("deve rejeitar transição direta de BACKLOG para EM_PROGRESSO", () => {
    const item = BacklogItem.create({
      id: "item-5",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item direto",
    })

    expect(() =>
      item.transitionTo(WorkItemStatus.EM_PROGRESSO, "user-1")
    ).toThrow("Transição inválida")
  })

  it("deve rejeitar transição de ENTREGUE (terminal)", () => {
    const item = BacklogItem.create({
      id: "item-6",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item entregue",
      status: "ENTREGUE",
    })

    expect(() =>
      item.transitionTo(WorkItemStatus.BACKLOG, "user-1")
    ).toThrow("Transição inválida")
  })

  it("deve rejeitar transição de CANCELADO (terminal)", () => {
    const item = BacklogItem.create({
      id: "item-7",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item cancelado",
      status: "CANCELADO",
    })

    expect(() =>
      item.transitionTo(WorkItemStatus.BACKLOG, "user-1")
    ).toThrow("Transição inválida")
  })
})

describe("H01 — Registro e resolução de bloqueio mantêm consistência de status", () => {
  it("deve rejeitar registro de bloqueio fora de EM_PROGRESSO/BLOQUEADO", () => {
    const item = BacklogItem.create({
      id: "item-block-1",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item pronto",
      status: "PRONTO_PARA_INICIAR",
    })

    expect(() =>
      item.registerBlocker(
        Blocker.create({
          id: "b1",
          backlogItemId: "item-block-1",
          reportedBy: "user-1",
          description: "Impedimento externo",
        })
      )
    ).toThrow("Transição inválida")
  })

  it("deve fixar item em BLOQUEADO enquanto houver bloqueio aberto", () => {
    const item = BacklogItem.create({
      id: "item-block-2",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item em progresso",
      status: "EM_PROGRESSO",
    })

    item.registerBlocker(
      Blocker.create({
        id: "b2",
        backlogItemId: "item-block-2",
        reportedBy: "user-1",
        description: "Aguardando resposta",
      })
    )

    expect(item.status.toString()).toBe("BLOQUEADO")

    expect(() =>
      item.transitionTo(WorkItemStatus.EM_PROGRESSO, "user-1")
    ).toThrow("bloqueio aberto")
  })

  it("deve retornar automaticamente para EM_PROGRESSO quando o último bloqueio é resolvido", () => {
    const item = BacklogItem.create({
      id: "item-block-3",
      projectId: "proj-1",
      frontId: "front-1",
      columnId: "col-1",
      title: "Item em progresso",
      status: "EM_PROGRESSO",
    })

    item.registerBlocker(
      Blocker.create({
        id: "b3",
        backlogItemId: "item-block-3",
        reportedBy: "user-1",
        description: "Dependência",
      })
    )

    item.resolveBlocker("b3", "user-1")

    expect(item.hasOpenBlockers()).toBe(false)
    expect(item.status.toString()).toBe("EM_PROGRESSO")
  })
})
