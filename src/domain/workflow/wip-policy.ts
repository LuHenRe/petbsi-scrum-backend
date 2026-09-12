import { WipLimit } from "../shared/wip-limit"
import { WorkflowColumn } from "./workflow-column"
import { WipLimitExceededError } from "../shared/errors"

export class WipPolicy {
  static validateMove(
    column: WorkflowColumn,
    currentCount: number
  ): void {
    if (!column.canReceive(currentCount)) {
      const limit = column.wipLimit?.getValue() ?? 0
      throw new WipLimitExceededError(column.name, limit)
    }
  }

  static getColumnUtilization(
    column: WorkflowColumn,
    currentCount: number
  ): { count: number; limit: number | null; isFull: boolean } {
    const limit = column.wipLimit?.getValue() ?? null
    return {
      count: currentCount,
      limit,
      isFull: limit !== null ? currentCount >= limit : false,
    }
  }
}
