import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?returnTo=/profile')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, phone, email')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold font-serif text-secondary-50">Profile</h1>
        <p className="text-sm text-muted-foreground">
          View and update your account details.
        </p>
      </header>

      <ProfileForm
        userId={user.id}
        email={profile?.email ?? user.email ?? ''}
        initialValues={{
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          phone: profile?.phone ?? '',
        }}
      />
    </div>
  )
}
