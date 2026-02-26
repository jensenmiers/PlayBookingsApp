import * as z from 'zod'

const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS')
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const operatingHourWindowSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((value) => value.start_time < value.end_time, {
    message: 'Operating hour end_time must be after start_time',
    path: ['end_time'],
  })

export const dropInTemplateWindowSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((value) => value.start_time < value.end_time, {
    message: 'Drop-in template end_time must be after start_time',
    path: ['end_time'],
  })

export const updateVenueAdminConfigSchema = z
  .object({
    hourly_rate: z.number().positive().optional(),
    instant_booking: z.boolean().optional(),
    insurance_required: z.boolean().optional(),
    amenities: z.array(z.string().min(1)).optional(),
    is_active: z.boolean().optional(),

    drop_in_enabled: z.boolean().optional(),
    drop_in_price: z.number().positive().nullable().optional(),
    min_advance_booking_days: z.number().int().min(0).optional(),
    min_advance_lead_time_hours: z.number().int().min(0).optional(),
    operating_hours: z.array(operatingHourWindowSchema).optional(),
    blackout_dates: z.array(dateSchema).optional(),
    holiday_dates: z.array(dateSchema).optional(),
    insurance_requires_manual_approval: z.boolean().optional(),
    insurance_document_types: z.array(z.string().min(1)).optional(),
    policy_cancel: z.string().nullable().optional(),
    policy_refund: z.string().nullable().optional(),
    policy_reschedule: z.string().nullable().optional(),
    policy_no_show: z.string().nullable().optional(),
    policy_operating_hours_notes: z.string().nullable().optional(),
    drop_in_templates: z.array(dropInTemplateWindowSchema).optional(),
    review_cadence_days: z.number().int().min(1).max(365).optional(),
    last_reviewed_at: z.string().datetime().nullable().optional(),
    mark_reviewed_now: z.boolean().optional(),
  })
  .refine(
    (value) => {
      if (value.drop_in_enabled && value.drop_in_price === undefined) {
        return false
      }
      return true
    },
    {
      message: 'drop_in_price is required when drop_in_enabled is true',
      path: ['drop_in_price'],
    }
  )

export type UpdateVenueAdminConfigInput = z.infer<typeof updateVenueAdminConfigSchema>
