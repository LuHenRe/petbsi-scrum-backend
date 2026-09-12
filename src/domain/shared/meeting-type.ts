const VALID_TYPES = [
  "TUESDAY_MEETING",
  "WEDNESDAY_MAIN_MEETING",
  "SPRINT_PLANNING",
  "SPRINT_REVIEW",
  "SPRINT_RETROSPECTIVE",
  "DEADLINE_REMINDER",
  "BLOCKER_REMINDER",
  "CUSTOM",
] as const

export type MeetingTypeValue = (typeof VALID_TYPES)[number]

export class MeetingType {
  private constructor(private readonly value: MeetingTypeValue) {}

  static create(value: string): MeetingType {
    const normalized = value.toUpperCase().replace(/\s+/g, "_") as MeetingTypeValue
    if (!VALID_TYPES.includes(normalized)) {
      throw new Error(`Tipo de reunião inválido: "${value}"`)
    }
    return new MeetingType(normalized)
  }

  static readonly TUESDAY_MEETING = new MeetingType("TUESDAY_MEETING")
  static readonly WEDNESDAY_MAIN_MEETING = new MeetingType("WEDNESDAY_MAIN_MEETING")
  static readonly SPRINT_PLANNING = new MeetingType("SPRINT_PLANNING")
  static readonly SPRINT_REVIEW = new MeetingType("SPRINT_REVIEW")
  static readonly SPRINT_RETROSPECTIVE = new MeetingType("SPRINT_RETROSPECTIVE")
  static readonly DEADLINE_REMINDER = new MeetingType("DEADLINE_REMINDER")
  static readonly BLOCKER_REMINDER = new MeetingType("BLOCKER_REMINDER")
  static readonly CUSTOM = new MeetingType("CUSTOM")

  isMainMeeting(): boolean {
    return this.value === "WEDNESDAY_MAIN_MEETING"
  }

  equals(other: MeetingType): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): MeetingTypeValue {
    return this.value
  }
}
