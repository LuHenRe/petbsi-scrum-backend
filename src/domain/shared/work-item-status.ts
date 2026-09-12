const VALID_STATUSES = [
  "BACKLOG",
  "SELECIONADO",
  "PRONTO_PARA_INICIAR",
  "EM_PROGRESSO",
  "BLOQUEADO",
  "EM_REVISAO",
  "CONCLUIDO",
  "ENTREGUE",
  "CANCELADO",
] as const

export type WorkItemStatusValue = (typeof VALID_STATUSES)[number]

export class WorkItemStatus {
  private constructor(private readonly value: WorkItemStatusValue) {}

  static create(value: string): WorkItemStatus {
    const normalized = value.toUpperCase().replace(/\s+/g, "_") as WorkItemStatusValue
    if (!VALID_STATUSES.includes(normalized)) {
      throw new Error(`Status inválido: "${value}". Status válidos: ${VALID_STATUSES.join(", ")}`)
    }
    return new WorkItemStatus(normalized)
  }

  static readonly BACKLOG = new WorkItemStatus("BACKLOG")
  static readonly SELECIONADO = new WorkItemStatus("SELECIONADO")
  static readonly PRONTO_PARA_INICIAR = new WorkItemStatus("PRONTO_PARA_INICIAR")
  static readonly EM_PROGRESSO = new WorkItemStatus("EM_PROGRESSO")
  static readonly BLOQUEADO = new WorkItemStatus("BLOQUEADO")
  static readonly EM_REVISAO = new WorkItemStatus("EM_REVISAO")
  static readonly CONCLUIDO = new WorkItemStatus("CONCLUIDO")
  static readonly ENTREGUE = new WorkItemStatus("ENTREGUE")
  static readonly CANCELADO = new WorkItemStatus("CANCELADO")

  is(value: WorkItemStatusValue): boolean {
    return this.value === value
  }

  isTerminal(): boolean {
    return this.value === "ENTREGUE" || this.value === "CANCELADO"
  }

  isActive(): boolean {
    return ["EM_PROGRESSO", "BLOQUEADO", "EM_REVISAO"].includes(this.value)
  }

  equals(other: WorkItemStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): WorkItemStatusValue {
    return this.value
  }
}
