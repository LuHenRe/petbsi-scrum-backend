import { describe, it, expect } from "vitest"
import { EmailAddress } from "@/domain/shared/email-address"

describe("D11 — EmailAddress rejeita formato inválido", () => {
  it("deve aceitar e-mail válido", () => {
    const email = EmailAddress.create("user@example.com")
    expect(email.toString()).toBe("user@example.com")
  })

  it("deve normalizar para lowercase", () => {
    const email = EmailAddress.create("User@Example.COM")
    expect(email.toString()).toBe("user@example.com")
  })

  it("deve rejeitar e-mail sem @", () => {
    expect(() => EmailAddress.create("userexample.com")).toThrow("inválido")
  })

  it("deve rejeitar e-mail sem domínio", () => {
    expect(() => EmailAddress.create("user@")).toThrow("inválido")
  })

  it("deve rejeitar e-mail vazio", () => {
    expect(() => EmailAddress.create("")).toThrow("inválido")
  })

  it("deve rejeitar e-mail com espaços", () => {
    expect(() => EmailAddress.create("user @example.com")).toThrow("inválido")
  })

  it("deve comparar dois e-mails por valor", () => {
    const email1 = EmailAddress.create("user@example.com")
    const email2 = EmailAddress.create("user@example.com")
    const email3 = EmailAddress.create("other@example.com")

    expect(email1.equals(email2)).toBe(true)
    expect(email1.equals(email3)).toBe(false)
  })
})
