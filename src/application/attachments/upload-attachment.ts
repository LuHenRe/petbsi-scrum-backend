import { randomUUID } from "crypto"
import { AuthGateway } from "../ports/auth-gateway"
import {
  AttachmentRepository,
  BacklogItemRepository,
  DeliveryRepository,
  AuditPort,
} from "../ports/repositories"
import { FileStorageGateway, UploadFileInput } from "../ports/file-storage-gateway"
import { Attachment } from "@/domain/integration/attachment"

export interface UploadAttachmentInput {
  projectId: string
  backlogItemId?: string
  deliveryId?: string
  file: UploadFileInput
}

export interface UploadAttachmentResult {
  attachmentId: string
  status: string
  externalFileId: string | null
  fileName: string | null
  viewUrl: string | null
  errorMessage: string | null
}

export class UploadAttachmentUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly backlogItemRepository: BacklogItemRepository,
    private readonly deliveryRepository: DeliveryRepository,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly auditPort: AuditPort
  ) {}

  async execute(input: UploadAttachmentInput): Promise<UploadAttachmentResult> {
    const context = await this.authGateway.requireProjectPermission(
      input.projectId,
      ["MEMBER", "SCRUM_MASTER", "COORDINATOR"]
    )

    await this.validateTargets(input)

    const attachmentId = randomUUID()
    const pending = await this.attachmentRepository.createPending(
      attachmentId,
      input.backlogItemId ?? null,
      input.deliveryId ?? null
    )

    try {
      const reference = await this.fileStorageGateway.upload(input.file)

      const attachment = pending
      attachment.markCompleted(reference, context.user.personId)

      await this.attachmentRepository.save(attachment)

      await this.auditPort.record(context.user.personId, input.projectId, {
        eventType: "ATTACHMENT_UPLOADED",
        aggregateType: "Attachment",
        aggregateId: attachment.id,
        metadata: {
          fileName: reference.fileName,
          externalFileId: reference.externalFileId,
        },
      })

      return {
        attachmentId: attachment.id,
        status: attachment.status,
        externalFileId: reference.externalFileId,
        fileName: reference.fileName,
        viewUrl: reference.viewUrl ?? null,
        errorMessage: null,
      }
    } catch (error) {
      pending.markFailed()
      await this.attachmentRepository.save(pending)

      const message =
        error instanceof Error ? error.message : "Falha no upload para o Drive"

      await this.auditPort.record(context.user.personId, input.projectId, {
        eventType: "ATTACHMENT_UPLOAD_FAILED",
        aggregateType: "Attachment",
        aggregateId: pending.id,
        metadata: { errorMessage: message },
      })

      return {
        attachmentId: pending.id,
        status: "FAILED",
        externalFileId: null,
        fileName: null,
        viewUrl: null,
        errorMessage: message,
      }
    }
  }

  private async validateTargets(input: UploadAttachmentInput): Promise<void> {
    if (!input.backlogItemId && !input.deliveryId) {
      throw new Error("Anexo deve estar vinculado a um item ou entrega")
    }

    if (input.backlogItemId) {
      const item = await this.backlogItemRepository.findById(input.backlogItemId)
      if (!item || item.projectId !== input.projectId) {
        throw new Error("Item de destino não encontrado no projeto")
      }
    }

    if (input.deliveryId) {
      const delivery = await this.deliveryRepository.findById(input.deliveryId)
      if (!delivery || delivery.projectId !== input.projectId) {
        throw new Error("Entrega de destino não encontrada no projeto")
      }
    }
  }
}