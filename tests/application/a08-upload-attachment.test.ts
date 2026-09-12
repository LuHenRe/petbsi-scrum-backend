import { describe, it, expect } from "vitest"
import { UploadAttachmentUseCase } from "@/application/attachments/upload-attachment"
import {
  FakeAuthGateway,
  FakeAttachmentRepository,
  FakeBacklogItemRepository,
  FakeDeliveryRepository,
  FakeAuditPort,
} from "./fakes/fake-repositories"
import { FakeFileStorageGateway } from "./fakes/fake-gateways"
import { makeBacklogItem, PROJECT_ID } from "./fakes/fixtures"

function makeFile(name = "relatorio.pdf"): {
  fileName: string
  mimeType: string
  content: Buffer
} {
  return {
    fileName: name,
    mimeType: "application/pdf",
    content: Buffer.from("conteudo do arquivo"),
  }
}

describe("A08 — UC08 Enviar arquivo ao Drive", () => {
  it("deve concluir upload e vincular metadados", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))
    const storage = new FakeFileStorageGateway()
    const audit = new FakeAuditPort()

    const useCase = new UploadAttachmentUseCase(
      auth,
      new FakeAttachmentRepository(),
      items,
      new FakeDeliveryRepository(),
      storage,
      audit
    )

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      backlogItemId: "item-1",
      file: makeFile(),
    })

    expect(result.status).toBe("COMPLETED")
    expect(result.externalFileId).toBe("drive-file-relatorio.pdf")
    expect(result.fileName).toBe("relatorio.pdf")
    expect(storage.uploadCalls).toHaveLength(1)
    expect(audit.countEventType("ATTACHMENT_UPLOADED")).toBe(1)
  })

  it("deve marcar como FAILED quando o Drive falha", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))
    const storage = new FakeFileStorageGateway()
    storage.fail = true
    const audit = new FakeAuditPort()

    const useCase = new UploadAttachmentUseCase(
      auth,
      new FakeAttachmentRepository(),
      items,
      new FakeDeliveryRepository(),
      storage,
      audit
    )

    const result = await useCase.execute({
      projectId: PROJECT_ID,
      backlogItemId: "item-1",
      file: makeFile(),
    })

    expect(result.status).toBe("FAILED")
    expect(result.externalFileId).toBeNull()
    expect(result.errorMessage).toContain("indisponível")
    expect(audit.countEventType("ATTACHMENT_UPLOAD_FAILED")).toBe(1)
  })

  it("deve permitir retry após falha", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))
    const storage = new FakeFileStorageGateway()
    const attachments = new FakeAttachmentRepository()
    const audit = new FakeAuditPort()

    const useCase = new UploadAttachmentUseCase(
      auth,
      attachments,
      items,
      new FakeDeliveryRepository(),
      storage,
      audit
    )

    storage.fail = true
    const failed = await useCase.execute({
      projectId: PROJECT_ID,
      backlogItemId: "item-1",
      file: makeFile(),
    })

    storage.fail = false
    const retried = await useCase.execute({
      projectId: PROJECT_ID,
      backlogItemId: "item-1",
      file: makeFile(),
    })

    expect(failed.status).toBe("FAILED")
    expect(retried.status).toBe("COMPLETED")
    expect(storage.uploadCalls).toHaveLength(2)
  })

  it("deve rejeitar anexo sem destino", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")

    const useCase = new UploadAttachmentUseCase(
      auth,
      new FakeAttachmentRepository(),
      new FakeBacklogItemRepository(),
      new FakeDeliveryRepository(),
      new FakeFileStorageGateway(),
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        file: makeFile(),
      })
    ).rejects.toThrow("vinculado")
  })

  it("deve rejeitar anexo com destino inexistente", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "MEMBER")
    const items = new FakeBacklogItemRepository()
    items.items.push(makeBacklogItem({ id: "item-1" }))

    const useCase = new UploadAttachmentUseCase(
      auth,
      new FakeAttachmentRepository(),
      items,
      new FakeDeliveryRepository(),
      new FakeFileStorageGateway(),
      new FakeAuditPort()
    )

    await expect(
      useCase.execute({
        projectId: PROJECT_ID,
        backlogItemId: "item-inexistente",
        file: makeFile(),
      })
    ).rejects.toThrow("não encontrado")
  })
})