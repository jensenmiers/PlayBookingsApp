import * as z from 'zod'

const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/

export const profileSchema = z.object({
  first_name: z.string().trim().max(50, 'First name must be 50 characters or fewer'),
  last_name: z.string().trim().max(50, 'Last name must be 50 characters or fewer'),
  phone: z
    .string()
    .trim()
    .refine((value) => {
      if (value === '') return true
      const digitCount = value.replace(/\D/g, '').length
      return PHONE_CHARACTERS.test(value) && digitCount >= 10 && digitCount <= 15
    }, 'Enter a valid phone number'),
})

export type ProfileInput = z.infer<typeof profileSchema>
