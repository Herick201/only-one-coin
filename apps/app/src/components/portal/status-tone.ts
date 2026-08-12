import type { Tone } from './ui'
import type {
  DocumentStatus,
  EnrollmentStatus,
  PaymentStatus,
  SeatStatus,
} from '@/lib/portal/types'

/** Maps domain enums to a visual tone. No UI copy here — labels come from i18n. */

export const enrollmentTone: Record<EnrollmentStatus, Tone> = {
  under_review: 'warning',
  active: 'success',
  completed: 'neutral',
  rejected: 'danger',
}

export const paymentTone: Record<PaymentStatus, Tone> = {
  pending: 'neutral',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export const seatTone: Record<SeatStatus, Tone> = {
  reserved: 'warning',
  confirmed: 'success',
  released: 'neutral',
}

export const documentTone: Record<DocumentStatus, Tone> = {
  available: 'success',
  pending: 'warning',
  locked: 'neutral',
}
