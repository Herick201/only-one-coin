import { apiFetch } from './api-client'
import type { StudentDetail, StudentRow } from './types'

/**
 * The student directory (no `q`) and, elsewhere, the manual enrollment
 * form's picker (`q` set) — same `GET /api/v1/students` route, which
 * merges both concerns off one query (`apps/api/src/infra/persistence/
 * student/ListStudentsQuery.ts`).
 */
export async function listStudents(): Promise<StudentRow[]> {
  const response = await apiFetch('/api/v1/students')
  if (!response.ok) return []
  return response.json()
}

/**
 * One student's file. Only the identity/guardian half is real —
 * `documents`, `documentRequests`, `attachments`, `activity` and
 * `enrollments` come back empty from the API itself (no table backs them
 * yet), not faked here, so a real id never mixes with unrelated mock
 * fixture content.
 */
export async function getStudent(id: string): Promise<StudentDetail | null> {
  const response = await apiFetch(`/api/v1/students/${id}`)
  if (!response.ok) return null
  return response.json()
}
