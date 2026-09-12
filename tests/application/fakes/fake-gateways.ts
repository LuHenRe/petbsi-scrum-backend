import { ExternalFileReference } from "@/domain/shared/external-file-reference"
import { EmailDeliveryResult, EmailGateway, EmailMessage } from "@/application/ports/email-gateway"
import {
  ExternalEventInput,
  ExternalEventReference,
  CalendarGateway,
} from "@/application/ports/calendar-gateway"
import { FileStorageGateway, UploadFileInput } from "@/application/ports/file-storage-gateway"

export class FakeFileStorageGateway implements FileStorageGateway {
  fail = false
  uploadCalls: UploadFileInput[] = []

  async upload(file: UploadFileInput): Promise<ExternalFileReference> {
    this.uploadCalls.push(file)
    if (this.fail) {
      throw new Error("Google Drive indisponível")
    }
    return ExternalFileReference.create({
      provider: "google_drive",
      externalFileId: `drive-file-${file.fileName}`,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.content.length,
      viewUrl: `https://drive.google.com/file/d/drive-file-${file.fileName}/view`,
    })
  }
}

export class FakeEmailGateway implements EmailGateway {
  fail = false
  calls: EmailMessage[] = []

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    this.calls.push(message)
    if (this.fail) {
      return {
        success: false,
        providerMessageId: null,
        errorMessage: "Gmail indisponível",
      }
    }
    return {
      success: true,
      providerMessageId: `gmail-msg-${message.providerReference}`,
      errorMessage: null,
    }
  }
}

export class FakeCalendarGateway implements CalendarGateway {
  fail = false
  calls: ExternalEventInput[] = []

  async createOrUpdate(event: ExternalEventInput): Promise<ExternalEventReference> {
    this.calls.push(event)
    if (this.fail) {
      throw new Error("Google Calendar indisponível")
    }
    return {
      externalEventId: `google-cal-${event.idempotencyKey}`,
      url: `https://calendar.google.com/event?eid=${event.idempotencyKey}`,
    }
  }
}