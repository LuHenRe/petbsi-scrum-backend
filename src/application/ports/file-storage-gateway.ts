import { ExternalFileReference } from "@/domain/shared/external-file-reference"

export interface UploadFileInput {
  fileName: string
  mimeType: string
  content: Buffer
}

export interface FileStorageGateway {
  upload(file: UploadFileInput, folderId?: string): Promise<ExternalFileReference>
}