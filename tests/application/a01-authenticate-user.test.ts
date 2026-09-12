import { describe, it, expect } from "vitest"
import { AuthenticateUserUseCase } from "@/application/auth/authenticate-user"
import { FakeAuthGateway, FakeProjectRepository } from "./fakes/fake-repositories"
import { makeProject } from "./fakes/fixtures"
import { PROJECT_ID } from "./fakes/fixtures"

describe("A01 — UC01 Autenticar usuário", () => {
  it("deve retornar identidade válida e projetos vinculados", async () => {
    const auth = new FakeAuthGateway()
    auth.addMembership(PROJECT_ID, "person-1", "COORDINATOR")
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())
    projects.addMembership(PROJECT_ID, "person-1", "COORDINATOR")

    const useCase = new AuthenticateUserUseCase(auth, projects)
    const result = await useCase.execute()

    expect(result.personId).toBe("person-1")
    expect(result.email).toBe("user@example.com")
    expect(result.projectIds).toContain(PROJECT_ID)
  })

  it("deve retornar lista vazia quando usuário não possui vínculo", async () => {
    const auth = new FakeAuthGateway()
    const projects = new FakeProjectRepository()
    projects.projects.push(makeProject())

    const useCase = new AuthenticateUserUseCase(auth, projects)
    const result = await useCase.execute()

    expect(result.projectIds).toEqual([])
  })

  it("deve rejeitar sessão expirada", async () => {
    const auth = new FakeAuthGateway()
    auth.forceSessionError = true
    const projects = new FakeProjectRepository()

    const useCase = new AuthenticateUserUseCase(auth, projects)
    await expect(useCase.execute()).rejects.toThrow("Sessão expirada")
  })
})