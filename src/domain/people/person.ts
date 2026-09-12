import { EmailAddress } from "../shared/email-address"

export interface PersonProps {
  id: string
  displayName: string
  email: string
  authSubject?: string
  createdAt?: Date
}

export class Person {
  private constructor(
    private readonly _id: string,
    private _displayName: string,
    private _email: EmailAddress,
    private _authSubject: string | null,
    private readonly _createdAt: Date
  ) {}

  static create(props: PersonProps): Person {
    return new Person(
      props.id,
      props.displayName,
      EmailAddress.create(props.email),
      props.authSubject ?? null,
      props.createdAt ?? new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get displayName(): string {
    return this._displayName
  }

  get email(): EmailAddress {
    return this._email
  }

  get authSubject(): string | null {
    return this._authSubject
  }

  get createdAt(): Date {
    return this._createdAt
  }

  updateDisplayName(name: string): void {
    if (!name.trim()) throw new Error("Nome é obrigatório")
    this._displayName = name
  }

  linkAuthSubject(subject: string): void {
    this._authSubject = subject
  }

  hasSameEmail(other: Person): boolean {
    return this._email.equals(other._email)
  }
}
