export interface ExternalFileReferenceProps {
  provider: string
  externalFileId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  viewUrl?: string
}

export class ExternalFileReference {
  private constructor(private readonly props: ExternalFileReferenceProps) {}

  static create(props: ExternalFileReferenceProps): ExternalFileReference {
    if (!props.provider) throw new Error("Provedor é obrigatório")
    if (!props.externalFileId) throw new Error("Identificador externo é obrigatório")
    if (!props.fileName) throw new Error("Nome do arquivo é obrigatório")
    if (props.sizeBytes < 0) throw new Error("Tamanho do arquivo não pode ser negativo")
    return new ExternalFileReference({ ...props })
  }

  get provider(): string {
    return this.props.provider
  }

  get externalFileId(): string {
    return this.props.externalFileId
  }

  get fileName(): string {
    return this.props.fileName
  }

  get mimeType(): string {
    return this.props.mimeType
  }

  get sizeBytes(): number {
    return this.props.sizeBytes
  }

  get viewUrl(): string | undefined {
    return this.props.viewUrl
  }

  toJSON(): ExternalFileReferenceProps {
    return { ...this.props }
  }
}
