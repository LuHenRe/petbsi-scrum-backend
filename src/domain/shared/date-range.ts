export class DateRange {
  private constructor(
    private readonly startsOn: Date,
    private readonly endsOn: Date
  ) {}

  static create(startsOn: Date, endsOn: Date): DateRange {
    if (startsOn >= endsOn) {
      throw new Error(
        `Período inválido: início (${startsOn.toISOString()}) deve ser anterior ao fim (${endsOn.toISOString()})`
      )
    }
    return new DateRange(new Date(startsOn), new Date(endsOn))
  }

  static fromStrings(startsOn: string, endsOn: string): DateRange {
    return DateRange.create(new Date(startsOn), new Date(endsOn))
  }

  contains(date: Date): boolean {
    return date >= this.startsOn && date <= this.endsOn
  }

  overlaps(other: DateRange): boolean {
    return this.startsOn < other.endsOn && other.startsOn < this.endsOn
  }

  durationInDays(): number {
    const diff = this.endsOn.getTime() - this.startsOn.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  getStartsOn(): Date {
    return new Date(this.startsOn)
  }

  getEndsOn(): Date {
    return new Date(this.endsOn)
  }

  equals(other: DateRange): boolean {
    return (
      this.startsOn.getTime() === other.startsOn.getTime() &&
      this.endsOn.getTime() === other.endsOn.getTime()
    )
  }

  toJSON(): { startsOn: string; endsOn: string } {
    return {
      startsOn: this.startsOn.toISOString(),
      endsOn: this.endsOn.toISOString(),
    }
  }
}
