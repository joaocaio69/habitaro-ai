import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/integrations?google_error=1`)
  }

  const userId = Buffer.from(state, 'base64').toString('utf8')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.redirect(`${siteUrl}/integrations?google_error=1`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) {
    return NextResponse.redirect(`${siteUrl}/integrations?google_error=1`)
  }

  const tokens = await exchangeCodeForTokens(code)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  const admin = createAdminClient()
  await admin.from('google_calendar_connections').upsert({
    user_id: user.id,
    agency_id: profile.agency_id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt.toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${siteUrl}/integrations?google_ok=1`)
}
