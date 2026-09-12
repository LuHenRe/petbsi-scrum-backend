export class WipLimit {
  private constructor(private readonly limit: number) {}

  static create(limit: number | null): WipLimit | null {
    if (limit === null || limit === undefined) {
      return null
    }
    if (limit < 0) {
      throw new Error(`Limite WIP não pode ser negativo: ${limit}`)
    }
    return new WipLimit(limit)
  }

  allows(currentCount: number): boolean {
    if (this.limit === 0) return false
    return currentCount < this.limit
  }

  isAtCapacity(currentCount: number): boolean {
    return currentCount >= this.limit
  }

  getValue(): number {
    return this.limit
  }

  equals(other: WipLimit): boolean {
    return this.limit === other.limit
  }

  toString(): string {
    return String(this.limit)
  }

  toJSON(): number {
    return this.limit
  }
}
