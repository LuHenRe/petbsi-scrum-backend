export interface ExternalEventInput {
  idempotencyKey: string
  title: string
  startsAt: Date
  endsAt: Date
  location?: string
}

export interface ExternalEventReference {
  externalEventId: string
  url?: string
}

export interface CalendarGateway {
  createOrUpdate(
    event: ExternalEventInput
  ): Promise<ExternalEventReference>
}