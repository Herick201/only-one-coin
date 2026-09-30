/**
 * The three calls behind "attach a receipt": mint a signed target
 * (`RequestReceiptUploadRoute`), PUT the file straight to the bucket — never
 * through `apps/api`'s own function (`CLAUDE.md` §6) — and confirm it landed
 * (`ConfirmReceiptUploadRoute`). Any step failing leaves nothing for the
 * checkout to hold onto: `ok: false` and the caller drops the attempt.
 */
export type RequestReceiptUploadOutcome =
  | { ok: true; receiptUploadId: string }
  | { ok: false }

export async function requestReceiptUpload(params: {
  seatHoldId: string
  file: File
}): Promise<RequestReceiptUploadOutcome> {
  try {
    const target = await fetch('/api/v1/receipt-uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatHoldId: params.seatHoldId, contentType: params.file.type }),
    })
    if (!target.ok) return { ok: false }

    const body = (await target.json()) as {
      receiptUploadId: string
      uploadUrl: string
      uploadFields: Record<string, string>
    }

    const form = new FormData()
    for (const [key, value] of Object.entries(body.uploadFields)) form.append(key, value)
    // The bucket's POST policy reads the multipart body in order — the file
    // has to be the last field, or the policy ignores what comes after it.
    form.append('file', params.file)

    const uploaded = await fetch(body.uploadUrl, { method: 'POST', body: form })
    if (!uploaded.ok) return { ok: false }

    const confirmed = await fetch(
      `/api/v1/receipt-uploads/${encodeURIComponent(body.receiptUploadId)}/confirm`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatHoldId: params.seatHoldId }),
      },
    )
    if (!confirmed.ok) return { ok: false }

    return { ok: true, receiptUploadId: body.receiptUploadId }
  } catch {
    return { ok: false }
  }
}
