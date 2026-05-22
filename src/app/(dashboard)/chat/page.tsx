import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatView } from '@/components/chat/chat-view'
import type { Conversation, ZaptosInstance } from '@/types/database'

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) redirect('/onboarding')

  const [instanceRes, convsRes] = await Promise.all([
    supabase
      .from('zaptos_instances')
      .select('id, instance_name, status, phone_number')
      .eq('agency_id', profile.agency_id)
      .maybeSingle(),
    supabase
      .from('conversations')
      .select('*')
      .eq('agency_id', profile.agency_id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100),
  ])

  return (
    <ChatView
      instance={(instanceRes.data ?? null) as ZaptosInstance | null}
      initialConversations={(convsRes.data ?? []) as Conversation[]}
    />
  )
}
