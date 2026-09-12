export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DomainError"
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(entity: string, from: string, to: string) {
    super(`Transição inválida em ${entity}: "${from}" → "${to}"`)
    this.name = "InvalidTransitionError"
  }
}

export class WipLimitExceededError extends DomainError {
  constructor(columnName: string, limit: number) {
    super(`Limite WIP da coluna "${columnName}" atingido: ${limit}`)
    this.name = "WipLimitExceededError"
  }
}

export class DuplicateItemError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = "DuplicateItemError"
  }
}

export class ActiveSprintExistsError extends DomainError {
  constructor(projectId: string) {
    super(`Já existe uma Sprint ativa no projeto "${projectId}"`)
    this.name = "ActiveSprintExistsError"
  }
}

export class MissingSprintGoalError extends DomainError {
  constructor() {
    super("Meta da Sprint é obrigatória antes de iniciar")
    this.name = "MissingSprintGoalError"
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Acesso negado") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class BlockerRequiredError extends DomainError {
  constructor() {
    super("Item bloqueado requer um bloqueio aberto")
    this.name = "BlockerRequiredError"
  }
}

export class InvalidRecipientError extends DomainError {
  constructor(email: string) {
    super(`Destinatário inválido ou não pertence ao projeto: ${email}`)
    this.name = "InvalidRecipientError"
  }
}
