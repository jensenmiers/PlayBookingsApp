export type UserRole = 'venue_owner' | 'renter' | 'admin'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type InsuranceStatus = 'pending' | 'approved' | 'rejected' | 'needs_changes'

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'

export type RecurringType = 'none' | 'weekly' | 'monthly'

export interface User {
  id: string
  email: string
  role: UserRole
  is_renter: boolean
  is_venue_owner: boolean
  first_name?: string
  last_name?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  name: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  latitude?: number
  longitude?: number
  owner_id: string
  hourly_rate: number
  instant_booking: boolean
  insurance_required: boolean
  max_advance_booking_days: number
  photos: string[]
  amenities: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Availability {
  id: string
  venue_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  venue_id: string
  renter_id: string
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
  total_amount: number
  insurance_approved: boolean
  insurance_required: boolean
  recurring_type: RecurringType
  recurring_end_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface RecurringBooking {
  id: string
  parent_booking_id: string
  venue_id: string
  renter_id: string
  date: string
  start_time: string
  end_time: string
  status: BookingStatus
  total_amount: number
  insurance_approved: boolean
  created_at: string
  updated_at: string
}

export interface InsuranceDocument {
  id: string
  booking_id: string
  renter_id: string
  document_url: string
  policy_number?: string
  coverage_amount?: number
  effective_date: string
  expiration_date: string
  status: InsuranceStatus
  rejection_reason?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  booking_id: string
  renter_id: string
  venue_id: string
  stripe_payment_intent_id?: string
  stripe_transfer_id?: string
  amount: number
  platform_fee: number
  venue_owner_amount: number
  status: PaymentStatus
  paid_at?: string
  refunded_at?: string
  refund_amount?: number
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'create' | 'update' | 'delete'
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  user_id: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id?: string
  stripe_customer_id?: string
  status: string
  current_period_start: string
  current_period_end: string
  trial_end?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  booking_id?: string
  subject?: string
  content: string
  is_read: boolean
  created_at: string
}

// Extended interfaces for better type safety and business logic
export interface VenueWithOwner extends Venue {
  owner: User
}

export interface AvailabilityWithVenue extends Availability {
  venue: Venue
}

export interface BookingWithDetails extends Booking {
  venue: Venue
  renter: User
  insurance_documents: InsuranceDocument[]
  payments: Payment[]
  recurring_bookings: RecurringBooking[]
}

export interface RecurringBookingWithDetails extends RecurringBooking {
  parent_booking: Booking
  venue: Venue
  renter: User
}

export interface PaymentWithDetails extends Payment {
  booking: Booking
  renter: User
  venue: Venue
}

export interface InsuranceDocumentWithDetails extends InsuranceDocument {
  booking: Booking
  renter: User
  reviewer?: User
}

// Form interfaces for creating/updating records
export interface CreateVenueForm {
  name: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  latitude?: number
  longitude?: number
  hourly_rate: number
  instant_booking: boolean
  insurance_required: boolean
  max_advance_booking_days: number
  photos: string[]
  amenities: string[]
}

export interface CreateBookingForm {
  venue_id: string
  date: string
  start_time: string
  end_time: string
  recurring_type: RecurringType
  recurring_end_date?: string
  notes?: string
}

export interface UpdateBookingForm {
  status?: BookingStatus
  notes?: string
  recurring_type?: RecurringType
  recurring_end_date?: string
}

export interface CreateInsuranceDocumentForm {
  booking_id: string
  document_url: string
  policy_number?: string
  coverage_amount?: number
  effective_date: string
  expiration_date: string
}

export interface UpdateInsuranceDocumentForm {
  status?: InsuranceStatus
  rejection_reason?: string
}

export interface CreatePaymentForm {
  booking_id: string
  amount: number
  platform_fee: number
  venue_owner_amount: number
  stripe_payment_intent_id?: string
}

export interface UpdatePaymentForm {
  status: PaymentStatus
  stripe_transfer_id?: string
  paid_at?: string
  refunded_at?: string
  refund_amount?: number
}

// Search and filter interfaces
export interface VenueSearchFilters {
  city?: string
  state?: string
  min_price?: number
  max_price?: number
  amenities?: string[]
  insurance_required?: boolean
  instant_booking?: boolean
  date?: string
  start_time?: string
  end_time?: string
}

export interface BookingSearchFilters {
  venue_id?: string
  renter_id?: string
  status?: BookingStatus
  date_from?: string
  date_to?: string
  recurring_type?: RecurringType
}

// Business logic helper types
export interface TimeSlot {
  date: string
  start_time: string
  end_time: string
}

export interface BookingConflict {
  existing_booking_id: string
  existing_date: string
  existing_start_time: string
  existing_end_time: string
  conflict_type: 'time_overlap' | 'availability_unavailable' | 'advance_booking_exceeded'
}

export interface RecurringBookingPattern {
  type: RecurringType
  start_date: string
  end_date: string
  time_slots: TimeSlot[]
}

// API response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// Error types
export interface DatabaseError {
  code: string
  message: string
  detail?: string
  hint?: string
}

export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

// Utility types for form handling
export type FormField<T> = {
  value: T
  error?: string
  touched: boolean
}

export type FormState<T> = {
  [K in keyof T]: FormField<T[K]>
}

// Business rule constants
export const BUSINESS_RULES = {
  MAX_ADVANCE_BOOKING_DAYS: 180,
  CANCELLATION_NOTICE_HOURS: 48,
  RECURRING_WEEKLY_MAX_MONTHS: 3,
  RECURRING_MONTHLY_MAX_MONTHS: 6,
  MIN_BOOKING_DURATION_HOURS: 1,
  MAX_BOOKING_DURATION_HOURS: 24,
} as const

// Status transition rules
export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [],
  completed: [],
}

export const INSURANCE_STATUS_TRANSITIONS: Record<InsuranceStatus, InsuranceStatus[]> = {
  pending: ['approved', 'rejected', 'needs_changes'],
  approved: ['rejected', 'needs_changes'],
  rejected: ['pending'],
  needs_changes: ['pending'],
}

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ['paid', 'failed'],
  paid: ['refunded'],
  refunded: [],
  failed: ['pending'],
}
