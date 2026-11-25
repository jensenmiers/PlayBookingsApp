'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { profileSchema, type ProfileInput } from '@/lib/validations/profile'

interface ProfileFormProps {
  userId: string
  email: string
  initialValues: ProfileInput
}

type FieldErrors = Partial<Record<keyof ProfileInput, string>>

export function ProfileForm({ userId, email, initialValues }: ProfileFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<ProfileInput>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof ProfileInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = profileSchema.safeParse(values)
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ProfileInput
        errors[field] ??= issue.message
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          first_name: parsed.data.first_name || null,
          last_name: parsed.data.last_name || null,
          phone: parsed.data.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        toast({ variant: 'error', title: 'Could not save profile', description: error.message })
        return
      }

      setValues(parsed.data)
      toast({ variant: 'success', title: 'Profile updated' })
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your profile right now.'
      toast({ variant: 'error', title: 'Could not save profile', description: message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="max-w-xl border-secondary-50/10 bg-secondary-800 p-2xl shadow-soft">
      <CardContent className="p-0">
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" value={email} disabled readOnly />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">First name</Label>
              <Input
                id="profile-first-name"
                autoComplete="given-name"
                value={values.first_name}
                onChange={handleChange('first_name')}
                aria-invalid={Boolean(fieldErrors.first_name)}
              />
              {fieldErrors.first_name && (
                <p className="text-sm text-destructive">{fieldErrors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">Last name</Label>
              <Input
                id="profile-last-name"
                autoComplete="family-name"
                value={values.last_name}
                onChange={handleChange('last_name')}
                aria-invalid={Boolean(fieldErrors.last_name)}
              />
              {fieldErrors.last_name && (
                <p className="text-sm text-destructive">{fieldErrors.last_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone number (optional)</Label>
            <Input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={handleChange('phone')}
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}
          </div>

          <Button type="submit" disabled={saving} size="lg" className="rounded-xl">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
