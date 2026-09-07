import { apiFetch } from './api-client'
import type { StaffMemberRow, StaffRoleChange } from './types'

/** The team directory: real accounts plus invites still waiting on the person. */
export async function listStaff(): Promise<StaffMemberRow[]> {
  const response = await apiFetch('/api/v1/staff')
  if (!response.ok) return []
  const { items } = (await response.json()) as { items: StaffMemberRow[] }
  return items
}

/** The cargo ledger — reads `audit_log`, never edits it. */
export async function listStaffRoleChanges(): Promise<StaffRoleChange[]> {
  const response = await apiFetch('/api/v1/staff/role-changes')
  if (!response.ok) return []
  const { items } = (await response.json()) as { items: StaffRoleChange[] }
  return items
}
