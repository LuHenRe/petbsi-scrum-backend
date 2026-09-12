import { describe, it, expect } from "vitest"
import { DateRange } from "@/domain/shared/date-range"

describe("D12 — DateRange rejeita período invertido", () => {
  it("deve aceitar período válido", () => {
    const range = DateRange.create(
      new Date("2026-09-01"),
      new Date("2026-09-14")
    )

    expect(range.getStartsOn().toISOString().slice(0, 10)).toBe("2026-09-01")
    expect(range.getEndsOn().toISOString().slice(0, 10)).toBe("2026-09-14")
  })

  it("deve rejeitar início igual ao fim", () => {
    expect(() =>
      DateRange.create(new Date("2026-09-01"), new Date("2026-09-01"))
    ).toThrow("anterior ao fim")
  })

  it("deve rejeitar início após o fim", () => {
    expect(() =>
      DateRange.create(new Date("2026-09-14"), new Date("2026-09-01"))
    ).toThrow("anterior ao fim")
  })

  it("deve detectar contain()", () => {
    const range = DateRange.create(
      new Date("2026-09-01"),
      new Date("2026-09-14")
    )

    expect(range.contains(new Date("2026-09-07"))).toBe(true)
    expect(range.contains(new Date("2026-08-30"))).toBe(false)
    expect(range.contains(new Date("2026-09-15"))).toBe(false)
  })

  it("deve calcular duração em dias", () => {
    const range = DateRange.create(
      new Date("2026-09-01"),
      new Date("2026-09-14")
    )

    expect(range.durationInDays()).toBe(13)
  })

  it("deve detectar sobreposição", () => {
    const range1 = DateRange.create(
      new Date("2026-09-01"),
      new Date("2026-09-14")
    )
    const range2 = DateRange.create(
      new Date("2026-09-07"),
      new Date("2026-09-21")
    )
    const range3 = DateRange.create(
      new Date("2026-09-15"),
      new Date("2026-09-28")
    )

    expect(range1.overlaps(range2)).toBe(true)
    expect(range1.overlaps(range3)).toBe(false)
  })

  it("deve criar a partir de strings", () => {
    const range = DateRange.fromStrings("2026-09-01", "2026-09-14")
    expect(range.getStartsOn().toISOString().slice(0, 10)).toBe("2026-09-01")
  })
})
