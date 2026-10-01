import type { ClassGroupStatus } from './types'

/**
 * The only way forward, one step at a time, moved by a person (OOC-35).
 * Mirrors `NEXT_CLASS_GROUP_STATUS` in `packages/domain/src/catalog/ClassGroup.ts`
 * (apps/app never imports that package, CLAUDE.md §3) — keep the two in sync
 * by hand. The screen only uses it to draw the next button; the API refuses
 * any other step (`catalog.invalid_status_transition`).
 */
export const NEXT_CLASS_GROUP_STATUS: Record<ClassGroupStatus, ClassGroupStatus | null> = {
  draft: 'enrolling',
  enrolling: 'in_progress',
  in_progress: 'finished',
  finished: 'closed',
  closed: null,
}
