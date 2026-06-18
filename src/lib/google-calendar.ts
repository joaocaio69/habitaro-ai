import { createAdminClient } from '@/lib/supabase/admin'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
].join(' ')

export function getGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google-calendar/callback`,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google-calendar/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Failed to exchange code for tokens')
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh token')
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function getValidToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!conn) return null

  const expiresAt = new Date(conn.expires_at)
  const needsRefresh = expiresAt.getTime() - Date.now() < 60_000

  if (!needsRefresh) return conn.access_token

  const refreshed = await refreshAccessToken(conn.refresh_token)
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000)

  await supabase
    .from('google_calendar_connections')
    .update({ access_token: refreshed.access_token, expires_at: newExpiresAt.toISOString() })
    .eq('user_id', userId)

  return refreshed.access_token
}

interface ActivityData {
  title: string
  description?: string | null
  scheduled_at?: string | null
}

function toGoogleEvent(activity: ActivityData) {
  const start = activity.scheduled_at
    ? new Date(activity.scheduled_at)
    : new Date()
  const end = new Date(start.getTime() + 60 * 60 * 1000) // +1h

  return {
    summary: activity.title,
    description: activity.description ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
  }
}

export async function createGoogleEvent(
  userId: string,
  activity: ActivityData,
  calendarId = 'primary'
): Promise<string | null> {
  const token = await getValidToken(userId)
  if (!token) return null

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGoogleEvent(activity)),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.id as string
}

export async function updateGoogleEvent(
  userId: string,
  googleEventId: string,
  activity: ActivityData,
  calendarId = 'primary'
): Promise<void> {
  const token = await getValidToken(userId)
  if (!token) return

  await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toGoogleEvent(activity)),
  })
}

export async function deleteGoogleEvent(
  userId: string,
  googleEventId: string,
  calendarId = 'primary'
): Promise<void> {
  const token = await getValidToken(userId)
  if (!token) return

  await fetch(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
