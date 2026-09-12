export interface EmailMessage {
  to: string[]
  subject: string
  body: string
  providerReference?: string
}

export interface EmailDeliveryResult {
  success: boolean
  providerMessageId: string | null
  errorMessage: string | null
}

export interface EmailGateway {
  send(message: EmailMessage): Promise<EmailDeliveryResult>
}