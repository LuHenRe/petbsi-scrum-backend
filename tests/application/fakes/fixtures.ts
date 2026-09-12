import { BacklogItem } from "@/domain/backlog/backlog-item"
import { Project } from "@/domain/project/project"
import { WorkflowColumn } from "@/domain/workflow/workflow-column"
import { Sprint } from "@/domain/sprint/sprint"
import { Delivery } from "@/domain/delivery/delivery"
import { CalendarEvent } from "@/domain/integration/calendar-event"

export const PROJECT_ID = "proj-1"
export const COLUMN_BACKLOG = "col-backlog"
export const COLUMN_DOING = "col-doing"
export const COLUMN_DONE = "col-done"

let sequence = 0
function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${sequence}`
}

export function makeProject(overrides?: { id?: string; status?: string }): Project {
  return Project.create({
    id: overrides?.id ?? PROJECT_ID,
    name: "Sistema PET",
    status: overrides?.status ?? "ACTIVE",
  })
}

export function makeBacklogItem(overrides?: {
  id?: string
  projectId?: string
  frontId?: string
  columnId?: string
  title?: string
  status?: string
  priority?: string
  assigneeId?: string
  orderIndex?: number
}): BacklogItem {
  return BacklogItem.create({
    id: overrides?.id ?? nextId("item"),
    projectId: overrides?.projectId ?? PROJECT_ID,
    frontId: overrides?.frontId ?? "front-1",
    columnId: overrides?.columnId ?? COLUMN_BACKLOG,
    title: overrides?.title ?? "Item de teste",
    status: overrides?.status ?? "BACKLOG",
    priority: overrides?.priority ?? "MEDIUM",
    assigneeId: overrides?.assigneeId,
    orderIndex: overrides?.orderIndex ?? 0,
  })
}

export function makeColumn(overrides?: {
  id?: string
  projectId?: string
  name?: string
  wipLimit?: number | null
  orderIndex?: number
  active?: boolean
}): WorkflowColumn {
  return WorkflowColumn.create({
    id: overrides?.id ?? nextId("col"),
    projectId: overrides?.projectId ?? PROJECT_ID,
    name: overrides?.name ?? "Coluna",
    wipLimit: overrides?.wipLimit ?? null,
    orderIndex: overrides?.orderIndex ?? 0,
    active: overrides?.active ?? true,
  })
}

export function makeSprint(overrides?: {
  id?: string
  projectId?: string
  goal?: string
  status?: string
  startsOn?: Date
  endsOn?: Date
}): Sprint {
  return Sprint.create({
    id: overrides?.id ?? nextId("sprint"),
    projectId: overrides?.projectId ?? PROJECT_ID,
    goal: overrides?.goal ?? "Meta da Sprint",
    status: overrides?.status ?? "DRAFT",
    startsOn: overrides?.startsOn ?? new Date("2026-09-01"),
    endsOn: overrides?.endsOn ?? new Date("2026-09-14"),
  })
}

export function makeDelivery(overrides?: {
  id?: string
  projectId?: string
  sprintId?: string
  title?: string
  status?: string
  completedOn?: Date
}): Delivery {
  const delivery = Delivery.create({
    id: overrides?.id ?? nextId("delivery"),
    projectId: overrides?.projectId ?? PROJECT_ID,
    sprintId: overrides?.sprintId,
    title: overrides?.title ?? "Entrega de teste",
    status: overrides?.status ?? "PLANNED",
    completedOn: overrides?.completedOn,
  })
  return delivery
}

export function makeCalendarEvent(overrides?: {
  id?: string
  projectId?: string
  eventType?: string
  title?: string
  startsAt?: Date
  endsAt?: Date
  syncStatus?: string
  externalEventId?: string
}): CalendarEvent {
  return CalendarEvent.create({
    id: overrides?.id ?? nextId("event"),
    projectId: overrides?.projectId ?? PROJECT_ID,
    eventType: overrides?.eventType ?? "WEDNESDAY_MAIN_MEETING",
    title: overrides?.title ?? "Reunião principal",
    startsAt: overrides?.startsAt ?? new Date("2026-09-10T08:00:00"),
    endsAt: overrides?.endsAt ?? new Date("2026-09-10T10:00:00"),
    syncStatus: overrides?.syncStatus ?? "LOCAL",
    externalEventId: overrides?.externalEventId,
  })
}