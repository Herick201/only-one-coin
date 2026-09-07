/**
 * Staff invite links. The token itself is minted server-side
 * (`CreateStaffInviteUseCase`, `apps/api`) — this module only builds/checks
 * the link from what the API already returned, never generates a token.
 */

export function isInviteExpired(inviteExpiresAt: string | null): boolean {
  return inviteExpiresAt !== null && new Date(inviteExpiresAt).getTime() < Date.now()
}

/** Locale-free path to the completion screen — the caller adds locale + origin. */
export function buildInvitePath(token: string): string {
  return `/backoffice/invite/${token}`
}
