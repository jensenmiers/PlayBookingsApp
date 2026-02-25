import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdminEmail } from '@/lib/superAdmin'
import { SuperAdminVenueConfigPage } from '@/components/admin/super-admin-venue-config-page'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/auth/login')
  }

  const email = session.user.email || null
  if (!isSuperAdminEmail(email)) {
    redirect('/dashboard')
  }

  return <SuperAdminVenueConfigPage />
}
