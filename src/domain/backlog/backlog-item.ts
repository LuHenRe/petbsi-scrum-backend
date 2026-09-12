import { WorkItemStatus } from "../shared/work-item-status"
import { BacklogPriority } from "../shared/backlog-priority"
import { InvalidTransitionError, BlockerRequiredError } from "../shared/errors"
import { Blocker } from "../blocker/blocker"
import { WorkItemStateChange } from "../workflow/work-item-state-change"

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  BACKLOG: ["SELECIONADO", "CANCELADO"],
  SELECIONADO: ["BACKLOG", "PRONTO_PARA_INICIAR", "CANCELADO"],
  PRONTO_PARA_INICIAR: ["EM_PROGRESSO", "CANCELADO"],
  EM_PROGRESSO: ["BLOQUEADO", "EM_REVISAO", "CANCELADO"],
  BLOQUEADO: ["EM_PROGRESSO"],
  EM_REVISAO: ["EM_PROGRESSO", "CONCLUIDO"],
  CONCLUIDO: ["ENTREGUE"],
  ENTREGUE: [],
  CANCELADO: [],
}

export interface BacklogItemProps {
  id: string
  projectId: string
  frontId: string
  columnId: string
  title: string
  description?: string
  priority?: string
  status?: string
  assigneeId?: string
  orderIndex?: number
  createdAt?: Date
  updatedAt?: Date
}

export class BacklogItem {
  private _blockers: Blocker[] = []
  private _stateChanges: WorkItemStateChange[] = []
  private _openBlockers: Blocker[] = []

  private constructor(
    private readonly _id: string,
    private readonly _projectId: string,
    private _frontId: string,
    private _columnId: string,
    private _title: string,
    private _description: string | null,
    private _priority: BacklogPriority,
    private _status: WorkItemStatus,
    private _assigneeId: string | null,
    private _orderIndex: number,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(props: BacklogItemProps): BacklogItem {
    if (!props.title.trim()) {
      throw new Error("Título do item é obrigatório")
    }
    return new BacklogItem(
      props.id,
      props.projectId,
      props.frontId,
      props.columnId,
      props.title,
      props.description ?? null,
      BacklogPriority.create(props.priority ?? "MEDIUM"),
      WorkItemStatus.create(props.status ?? "BACKLOG"),
      props.assigneeId ?? null,
      props.orderIndex ?? 0,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date()
    )
  }

  get id(): string {
    return this._id
  }

  get projectId(): string {
    return this._projectId
  }

  get frontId(): string {
    return this._frontId
  }

  get columnId(): string {
    return this._columnId
  }

  get title(): string {
    return this._title
  }

  get description(): string | null {
    return this._description
  }

  get priority(): BacklogPriority {
    return this._priority
  }

  get status(): WorkItemStatus {
    return this._status
  }

  get assigneeId(): string | null {
    return this._assigneeId
  }

  get orderIndex(): number {
    return this._orderIndex
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get blockers(): readonly Blocker[] {
    return this._blockers
  }

  get openBlockers(): readonly Blocker[] {
    return this._openBlockers
  }

  get stateChanges(): readonly WorkItemStateChange[] {
    return this._stateChanges
  }

  moveTo(
    newColumnId: string,
    changedBy: string,
    changeId: string,
    reason?: string
  ): WorkItemStateChange {
    if (this._status.isTerminal()) {
      throw new InvalidTransitionError(
        "BacklogItem",
        this._status.toString(),
        "movimentação"
      )
    }

    const oldColumnId = this._columnId
    const change = WorkItemStateChange.create({
      id: changeId,
      backlogItemId: this._id,
      fromColumnId: oldColumnId,
      toColumnId: newColumnId,
      changedBy,
      reason,
      changedAt: new Date(),
    })

    this._columnId = newColumnId
    this._stateChanges.push(change)
    this._updatedAt = new Date()
    return change
  }

  transitionTo(newStatus: WorkItemStatus, changedBy: string): void {
    const allowed = ALLOWED_TRANSITIONS[this._status.toString()] ?? []
    if (!allowed.includes(newStatus.toString())) {
      throw new InvalidTransitionError(
        "BacklogItem",
        this._status.toString(),
        newStatus.toString()
      )
    }

    if (newStatus.is("BLOQUEADO") && this._openBlockers.length === 0) {
      throw new BlockerRequiredError()
    }

    if (
      this._status.is("BLOQUEADO") &&
      !newStatus.is("BLOQUEADO") &&
      this.hasOpenBlockers()
    ) {
      throw new Error(
        "Item com bloqueio aberto não pode sair de BLOQUEADO"
      )
    }

    this._status = newStatus
    this._updatedAt = new Date()
  }

  registerBlocker(blocker: Blocker): void {
    const allowed = ALLOWED_TRANSITIONS[this._status.toString()] ?? []
    if (
      !this._status.is("BLOQUEADO") &&
      !allowed.includes("BLOQUEADO")
    ) {
      throw new InvalidTransitionError(
        "BacklogItem",
        this._status.toString(),
        "BLOQUEADO (registro de bloqueio)"
      )
    }
    this._blockers.push(blocker)
    if (blocker.isOpen()) {
      this._openBlockers.push(blocker)
      this._status = WorkItemStatus.create("BLOQUEADO")
    }
    this._updatedAt = new Date()
  }

  resolveBlocker(blockerId: string, resolvedBy: string): void {
    const blocker = this._blockers.find((b) => b.id === blockerId)
    if (!blocker) {
      throw new Error(`Bloqueio "${blockerId}" não encontrado no item`)
    }
    blocker.resolve(resolvedBy)
    this._openBlockers = this._blockers.filter((b) => b.isOpen())
    if (this._status.is("BLOQUEADO") && !this.hasOpenBlockers()) {
      this._status = WorkItemStatus.create("EM_PROGRESSO")
    }
    this._updatedAt = new Date()
  }

  hasOpenBlockers(): boolean {
    return this._openBlockers.length > 0
  }

  loadBlockers(blockers: Blocker[]): void {
    this._blockers = blockers
    this._openBlockers = blockers.filter((b) => b.isOpen())
  }

  loadStateChanges(changes: WorkItemStateChange[]): void {
    this._stateChanges = changes
  }

  updateTitle(title: string): void {
    if (!title.trim()) throw new Error("Título é obrigatório")
    this._title = title
    this._updatedAt = new Date()
  }

  updateDescription(description: string | null): void {
    this._description = description
    this._updatedAt = new Date()
  }

  assignTo(personId: string): void {
    this._assigneeId = personId
    this._updatedAt = new Date()
  }

  changeFront(frontId: string): void {
    this._frontId = frontId
    this._updatedAt = new Date()
  }

  updatePriority(priority: string): void {
    this._priority = BacklogPriority.create(priority)
    this._updatedAt = new Date()
  }

  reorder(newIndex: number): void {
    this._orderIndex = newIndex
    this._updatedAt = new Date()
  }
}
