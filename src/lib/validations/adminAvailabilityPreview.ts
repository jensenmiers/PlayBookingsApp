import * as z from 'zod'
import {
  dropInTemplateWindowSchema,
  operatingHourWindowSchema,
} from './adminVenueConfig'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const adminAvailabilityPreviewSchema = z.object({
  operating_hours: z.array(operatingHourWindowSchema),
  drop_in_enabled: z.boolean(),
  drop_in_price: z.number().positive().nullable(),
  drop_in_templates: z.array(dropInTemplateWindowSchema),
  instant_booking: z.boolean(),
  min_advance_booking_days: z.number().int().min(0),
  min_advance_lead_time_hours: z.number().int().min(0),
  blackout_dates: z.array(dateSchema),
  holiday_dates: z.array(dateSchema),
})

export type AdminAvailabilityPreviewInput = z.infer<typeof adminAvailabilityPreviewSchema>
