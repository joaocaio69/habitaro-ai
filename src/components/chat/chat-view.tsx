'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Send, Phone, Check, CheckCheck,
  Image as ImageIcon, Mic, FileText, Settings,
  Wifi, WifiOff, Loader2, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Conversation, Message, ZaptosInstance } from '@/types/database'

// ── helpers ─────────────────────────────────────────────────

function displayName(c: Conversation) {
  return c.contact_name || formatPhone(c.contact_phone)
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  return p
}

function timeLabel(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function msgTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function typeIcon(type: string) {
  if (type === 'image') return <ImageIcon className="h-3 w-3 inline mr-0.5" />
  if (type === 'audio') return <Mic className="h-3 w-3 inline mr-0.5" />
  if (type === 'document') return <FileText className="h-3 w-3 inline mr-0.5" />
  if (type === 'video') return <ExternalLink className="h-3 w-3 inline mr-0.5" />
  return null
}

function typeLabel(type: string, content: string | null) {
  if (type === 'image') return content || 'Foto'
  if (type === 'audio') return 'Áudio'
  if (type === 'video') return content || 'Vídeo'
  if (type === 'document') return content || 'Documento'
  if (type === 'sticker') return 'Sticker'
  return content || ''
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'pending') return <Check className="h-3 w-3 text-muted-foreground/50" />
  if (status === 'sent') return <Check className="h-3 w-3 text-muted-foreground/70" />
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-muted-foreground/70" />
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400" />
  return null
}

// ── Main ChatView ───────────────────────────────────────────

interface Props {
  instance: ZaptosInstance | null
  initialConversations: Conversation[]
}

export function ChatView({ instance: initialInstance, initialConversations }: Props) {
  const supabase = createClient()

  const [instance, setInstance] = useState(initialInstance)
  const [conversations, setConversations] = useState(initialConversations)
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showSettings] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selected) return
    setLoadingMsgs(true)
    setMessages([])
    fetch(`/api/conversations/${selected.id}/messages`)
      .then(r => r.json())
      .then((data: Message[]) => {
        setMessages(data)
        setConversations(prev =>
          prev.map(c => c.id === selected.id ? { ...c, unread_count: 0 } : c)
        )
      })
      .finally(() => setLoadingMsgs(false))
  }, [selected])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Supabase Realtime — new messages
  useEffect(() => {
    if (!instance) return
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message
          // Update message list if this conversation is open
          setMessages(prev => {
            if (prev.length > 0 && prev[0].conversation_id === msg.conversation_id) {
              if (prev.find(m => m.id === msg.id)) return prev
              return [...prev, msg]
            }
            return prev
          })
          // Update conversation preview
          setConversations(prev =>
            prev.map(c =>
              c.id === msg.conversation_id
                ? {
                    ...c,
                    last_message_preview: msg.content,
                    last_message_at: msg.timestamp,
                    unread_count: !msg.from_me && selected?.id !== msg.conversation_id
                      ? c.unread_count + 1
                      : 0,
                  }
                : c
            ).sort((a, b) =>
              (b.last_message_at ?? '').localeCompare(a.last_message_at ?? '')
            )
          )
        }
      )
      // New conversations
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations(prev => [payload.new as Conversation, ...prev])
        }
      )
      // Message status updates
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as Message
          setMessages(prev =>
            prev.map(m => m.id === updated.id ? { ...m, status: updated.status } : m)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [instance, selected, supabase])

  async function handleSend() {
    if (!selected || !text.trim() || sending) return
    const t = text.trim()
    setText('')
    setSending(true)

    // Optimistic message
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: selected.id,
      zaptos_message_id: null,
      from_me: true,
      content: t,
      type: 'text',
      media_url: null,
      status: 'pending',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    const res = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t }),
    })
    const json = await res.json() as Message

    if (res.ok) {
      setMessages(prev => prev.map(m => m.id === tempId ? json : m))
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(t)
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const filtered = conversations.filter(c =>
    !search ||
    displayName(c).toLowerCase().includes(search.toLowerCase()) ||
    c.contact_phone.includes(search)
  )

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-0">
      {/* Banner — sem integração ativa */}
      {!instance && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-sm">
          <div className="flex items-center gap-2 text-amber-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>WhatsApp não conectado. Configure a integração para receber mensagens.</span>
          </div>
          <Link href="/integrations">
            <Button size="sm" variant="outline" className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Conectar
            </Button>
          </Link>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden rounded-xl border border-border">
      {/* ── Conversation list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">WhatsApp</span>
            {!instance
              ? <WifiOff className="h-3.5 w-3.5 text-muted-foreground/40" />
              : instance.status === 'connected'
              ? <Wifi className="h-3.5 w-3.5 text-green-500" />
              : instance.status === 'connecting'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              : <WifiOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
          </div>
          <Link href="/integrations" className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Pesquisar"
              className="pl-8 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground/50 px-4">
              {conversations.length === 0
                ? 'Aguardando mensagens de leads…'
                : 'Nenhuma conversa encontrada'}
            </div>
          )}
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border/30 hover:bg-muted/40 transition-colors ${
                selected?.id === conv.id ? 'bg-muted/60' : ''
              }`}
            >
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                {displayName(conv).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold truncate">{displayName(conv)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {timeLabel(conv.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">
                    {conv.last_message_preview
                      ? typeLabel(
                          conv.last_message_preview.startsWith('http') ? 'document' : 'text',
                          conv.last_message_preview
                        ).slice(0, 40)
                      : ''}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Message panel ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Phone className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="px-5 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              {displayName(selected).slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{displayName(selected)}</p>
              <p className="text-xs text-muted-foreground">{formatPhone(selected.contact_phone)}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 bg-muted/10">
            {loadingMsgs && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingMsgs && messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground/50 py-8">
                Nenhuma mensagem ainda
              </p>
            )}
            {messages.map((msg, i) => {
              const showTime =
                i === 0 ||
                Math.abs(
                  new Date(msg.timestamp).getTime() -
                  new Date(messages[i - 1].timestamp).getTime()
                ) > 5 * 60_000

              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                        {new Date(msg.timestamp).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} mb-0.5`}>
                    <div
                      className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm break-words ${
                        msg.from_me
                          ? 'bg-foreground text-background rounded-br-sm'
                          : 'bg-card border border-border rounded-bl-sm'
                      }`}
                    >
                      {msg.type !== 'text' && (
                        <span className="flex items-center gap-1 text-xs opacity-70 mb-1">
                          {typeIcon(msg.type)}
                          {msg.type === 'audio' ? 'Áudio' : msg.type === 'image' ? 'Foto' : msg.type === 'video' ? 'Vídeo' : 'Arquivo'}
                        </span>
                      )}
                      {msg.content && <span>{msg.content}</span>}
                      <div className={`flex items-center gap-1 mt-1 ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] ${msg.from_me ? 'text-background/60' : 'text-muted-foreground/50'}`}>
                          {msgTimeLabel(msg.timestamp)}
                        </span>
                        {msg.from_me && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border bg-card shrink-0 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-muted/30 px-3.5 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 max-h-32 leading-relaxed"
              style={{ minHeight: '42px' }}
            />
            <Button
              size="icon"
              className="rounded-xl h-[42px] w-[42px] shrink-0"
              onClick={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
