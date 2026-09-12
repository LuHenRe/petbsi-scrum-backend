import { describe, it, expect } from "vitest"
import { QueryDeliveryHistoryUseCase } from "@/application/delivery/query-delivery-history"
import {
  FakeAuthGateway,
  FakeDeliveryRepository,
  FakeBacklogItemRepository,
} from "./fakes/fake-repositories"
import {
  makeDelivery,
  makeBacklogItem,
  PROJECT_ID,
  COLUMN_BACKLOG,
} from "./fakes/fixtures"

describe("A07 — UC07 Consultar entregas e histórico", () => {
  it("deve filtrar por status e período", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")

    const deliveries = new FakeDeliveryRepository()
    deliveries.deliveries.push(
      makeDelivery({
        id: "d-1",
        title: "Entrega concluída",
        status: "COMPLETED",
        completedOn: new Date("2026-09-05"),
      }),
      makeDelivery({ id: "d-2", title: "Entrega planejada", status: "PLANNED" })
    )

    const useCase = new QueryDeliveryHistoryUseCase(
      auth,
      deliveries,
      new FakeBacklogItemRepository()
    )

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      status: "COMPLETED",
      from: new Date("2026-09-01"),
      to: new Date("2026-09-30"),
    })

    expect(result.total).toBe(1)
    expect(result.items[0].title).toBe("Entrega concluída")
  })

  it("deve filtrar por frente de trabalho via itens vinculados", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")

    const items = new FakeBacklogItemRepository()
    items.items.push(
      makeBacklogItem({ id: "item-1", frontId: "front-a" }),
      makeBacklogItem({ id: "item-2", frontId: "front-b" })
    )

    const deliveries = new FakeDeliveryRepository()
    const withFrontA = makeDelivery({ id: "d-front-a", title: "Entrega A" })
    withFrontA.loadItemIds(["item-1"])
    const withFrontB = makeDelivery({ id: "d-front-b", title: "Entrega B" })
    withFrontB.loadItemIds(["item-2"])
    deliveries.deliveries.push(withFrontA, withFrontB)

    const useCase = new QueryDeliveryHistoryUseCase(auth, deliveries, items)
    const result = await useCase.execute({
      projectId: PROJECT_ID,
      frontId: "front-a",
    })

    expect(result.total).toBe(1)
    expect(result.items[0].id).toBe("d-front-a")
  })

  it("deve retornar vazio quando não há resultados", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "SCRUM_MASTER")

    const deliveries = new FakeDeliveryRepository()
    deliveries.deliveries.push(
      makeDelivery({
        id: "d-1",
        title: "Entrega concluída",
        status: "COMPLETED",
        completedOn: new Date("2026-09-05"),
      })
    )

    const useCase = new QueryDeliveryHistoryUseCase(
      auth,
      deliveries,
      new FakeBacklogItemRepository()
    )

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      from: new Date("2026-10-01"),
    })

    expect(result.total).toBe(0)
  })

  it("deve negar acesso para usuário sem vínculo", async () => {
    const auth = new FakeAuthGateway()
    const useCase = new QueryDeliveryHistoryUseCase(
      auth,
      new FakeDeliveryRepository(),
      new FakeBacklogItemRepository()
    )

    await expect(
      useCase.execute({ projectId: PROJECT_ID })
    ).rejects.toThrow("sem vínculo")
  })
})