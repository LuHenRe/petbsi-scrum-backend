export class BacklogPriority {
  private constructor(private readonly value: string) {}

  static readonly CRITICAL = new BacklogPriority("CRITICAL")
  static readonly HIGH = new BacklogPriority("HIGH")
  static readonly MEDIUM = new BacklogPriority("MEDIUM")
  static readonly LOW = new BacklogPriority("LOW")

  private static readonly ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

  static create(value: string): BacklogPriority {
    const normalized = value.toUpperCase()
    if (!BacklogPriority.ORDER.includes(normalized)) {
      throw new Error(`Prioridade inválida: "${value}". Valores: CRITICAL, HIGH, MEDIUM, LOW`)
    }
    return new BacklogPriority(normalized)
  }

  get rank(): number {
    return BacklogPriority.ORDER.indexOf(this.value)
  }

  isHigherThan(other: BacklogPriority): boolean {
    return this.rank < other.rank
  }

  equals(other: BacklogPriority): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
