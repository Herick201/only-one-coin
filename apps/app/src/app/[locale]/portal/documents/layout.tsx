import type { ReactNode } from 'react'
import { requireFeature } from '@/lib/feature-flags/server'

/**
 * Section gate. With `portal.documents` off the whole section answers 404 — this
 * screen, its details and anything added here tomorrow, which is why the gate
 * lives on the layout and not on each page (CLAUDE.md §5).
 */
export default async function PortalDocumentsLayout({ children }: { children: ReactNode }) {
  await requireFeature('portal.documents')
  return <>{children}</>
}
