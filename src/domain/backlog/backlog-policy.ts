import { BacklogItem } from "./backlog-item"
import { DuplicateItemError } from "../shared/errors"

export class BacklogPolicy {
  static canAddToSprint(
    item: BacklogItem,
    sprintItemIds: ReadonlySet<string>
  ): void {
    if (sprintItemIds.has(item.id)) {
      throw new DuplicateItemError(
        `Item "${item.id}" já está nesta Sprint`
      )
    }

    if (item.status.isTerminal()) {
      throw new Error(
        `Item "${item.title}" possui status terminal e não pode ser selecionado`
      )
    }
  }

  static canReorder(itemIds: string[]): void {
    const unique = new Set(itemIds)
    if (unique.size !== itemIds.length) {
      throw new DuplicateItemError("Itens duplicados na ordenação")
    }
  }
}
