import * as z from 'zod'

export const createBookingSchema = z.object({
  venue_id: z.string().uuid('Invalid venue ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
  recurring_type: z.enum(['none', 'weekly', 'monthly']).default('none'),
  recurring_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  notes: z.string().optional(),
}).refine((data) => data.start_time < data.end_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
})

export const updateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
  recurring_type: z.enum(['none', 'weekly', 'monthly']).optional(),
  recurring_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).partial()

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
})

export const checkConflictsSchema = z.object({
  venue_id: z.string().uuid('Invalid venue ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Time must be in HH:MM:SS format'),
  exclude_booking_id: z.string().uuid().optional(),
}).refine((data) => data.start_time < data.end_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
})

export const generateRecurringSchema = z.object({
  parent_booking_id: z.string().uuid('Invalid booking ID'),
  recurring_type: z.enum(['weekly', 'monthly']),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
})

export const bookingQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  venue_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_view: z.enum(['upcoming', 'past']).optional(),
  page: z.string().regex(/^\d+$/).optional().default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).optional().default('20').transform(Number),
  role_view: z.enum(['renter', 'host']).optional(),
})

export type CreateBookingInput = z.input<typeof createBookingSchema>
export type CreateBookingOutput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
export type CheckConflictsInput = z.infer<typeof checkConflictsSchema>
export type GenerateRecurringInput = z.infer<typeof generateRecurringSchema>
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>


