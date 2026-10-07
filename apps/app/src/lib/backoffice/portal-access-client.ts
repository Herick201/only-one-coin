export type IssuePortalAccessOutcome =
  | 'created'
  | 'linked_existing'
  | 'already_linked'
  | 'email_conflict'
  | 'activation_resent'
  | 'reset_sent'

export type IssuePortalAccessResult =
  | { ok: true; outcome: IssuePortalAccessOutcome }
  | { ok: false; error: 'no_confirmed_enrollment' | 'generic' }

/** Sends (or re-sends) a student's portal access; the API decides which. */
export async function issuePortalAccess(studentId: string): Promise<IssuePortalAccessResult> {
  try {
    const response = await fetch(`/api/v1/students/${encodeURIComponent(studentId)}/portal-access`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (response.ok) {
      return {
        ok: true,
        outcome: ((await response.json()) as { outcome: IssuePortalAccessOutcome }).outcome,
      }
    }
    const body = (await response.json().catch(() => null)) as { reason?: string } | null
    return {
      ok: false,
      error: body?.reason === 'portal_access.no_confirmed_enrollment' ? 'no_confirmed_enrollment' : 'generic',
    }
  } catch {
    return { ok: false, error: 'generic' }
  }
}
