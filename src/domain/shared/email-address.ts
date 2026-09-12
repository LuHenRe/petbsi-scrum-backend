const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export class EmailAddress {
  private constructor(private readonly value: string) {}

  static create(email: string): EmailAddress {
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new Error(`E-mail inválido: "${email}"`)
    }
    return new EmailAddress(trimmed)
  }

  static unsafeCreate(email: string): EmailAddress {
    return new EmailAddress(email.trim().toLowerCase())
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
