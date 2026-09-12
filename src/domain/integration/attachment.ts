import { ExternalFileReference } from "../shared/external-file-reference"

export interface AttachmentProps {
  id: string
  backlogItemId?: string
  deliveryId?: string
  uploadedBy?: string
  provider?: string
  externalFileId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  viewUrl?: string
  status?: string
  createdAt?: Date
}

export class Attachment {
  private constructor(
    private readonly _id: string,
    private _backlogItemId: string | null,
    private _deliveryId: string | null,
    private _uploadedBy: string | null,
    private _provider: string,
    private _externalFileId: string,
    private _fileName: string,
    private _mimeType: string,
    private _sizeBytes: number,
    private _viewUrl: string | null,
    private _status: string,
    private readonly _createdAt: Date
  ) {}

  static create(props: AttachmentProps): Attachment {
    return new Attachment(
      props.id,
      props.backlogItemId ?? null,
      props.deliveryId ?? null,
      props.uploadedBy ?? null,
      props.provider ?? "google_drive",
      props.externalFileId,
      props.fileName,
      props.mimeType,
      props.sizeBytes,
      props.viewUrl ?? null,
      props.status ?? "PENDING",
      props.createdAt ?? new Date()
    )
  }

  static createPending(
    id: string,
    backlogItemId: string | null,
    deliveryId: string | null
  ): Attachment {
    return new Attachment(
      id,
      backlogItemId,
      deliveryId,
      null,
      "google_drive",
      "",
      "",
      "",
      0,
      null,
      "PENDING",
      new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get backlogItemId(): string | null {
    return this._backlogItemId
  }

  get deliveryId(): string | null {
    return this._deliveryId
  }

  get uploadedBy(): string | null {
    return this._uploadedBy
  }

  get provider(): string {
    return this._provider
  }

  get externalFileId(): string {
    return this._externalFileId
  }

  get fileName(): string {
    return this._fileName
  }

  get mimeType(): string {
    return this._mimeType
  }

  get sizeBytes(): number {
    return this._sizeBytes
  }

  get viewUrl(): string | null {
    return this._viewUrl
  }

  get status(): string {
    return this._status
  }

  get createdAt(): Date {
    return this._createdAt
  }

  markCompleted(ref: ExternalFileReference, uploadedBy: string): void {
    this._provider = ref.provider
    this._externalFileId = ref.externalFileId
    this._fileName = ref.fileName
    this._mimeType = ref.mimeType
    this._sizeBytes = ref.sizeBytes
    this._viewUrl = ref.viewUrl ?? null
    this._uploadedBy = uploadedBy
    this._status = "COMPLETED"
  }

  markFailed(): void {
    this._status = "FAILED"
  }

  isPending(): boolean {
    return this._status === "PENDING"
  }

  isCompleted(): boolean {
    return this._status === "COMPLETED"
  }
}
