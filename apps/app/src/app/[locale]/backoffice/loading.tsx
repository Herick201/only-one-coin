import { LoadingScreen } from '@/components/loading-screen'

// Route-level fallback shown while the backoffice segment resolves.
export default function Loading() {
  return <LoadingScreen messageKey="verifying_session" />
}
