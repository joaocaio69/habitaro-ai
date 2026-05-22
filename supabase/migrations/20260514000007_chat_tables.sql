-- ============================================================
-- Chat: integração ZaptoWPP (WhatsApp)
-- ============================================================

-- 1. Instância ZaptoWPP por agência
create table zaptos_instances (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid not null unique references agencies on delete cascade,
  instance_name text not null,
  token         text not null,
  status        text not null default 'disconnected'
    check (status in ('disconnected', 'connecting', 'connected')),
  phone_number  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger zaptos_instances_updated_at
  before update on zaptos_instances
  for each row execute function update_updated_at();

alter table zaptos_instances enable row level security;

create policy "members can manage own instance"
  on zaptos_instances for all
  using (
    agency_id in (
      select agency_id from profiles
      where id = auth.uid() and agency_id is not null
    )
  );

-- 2. Conversas (uma por contato WhatsApp)
create table conversations (
  id                   uuid primary key default uuid_generate_v4(),
  agency_id            uuid not null references agencies on delete cascade,
  instance_id          uuid not null references zaptos_instances on delete cascade,
  contact_jid          text not null,           -- ex: 5511999999999@s.whatsapp.net
  contact_name         text,
  contact_phone        text not null,
  client_id            uuid references clients on delete set null,
  last_message_at      timestamptz,
  last_message_preview text,
  unread_count         int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(instance_id, contact_jid)
);

create index conversations_agency_last_msg_idx
  on conversations(agency_id, last_message_at desc nulls last);

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

alter table conversations enable row level security;

create policy "members can manage conversations"
  on conversations for all
  using (
    agency_id in (
      select agency_id from profiles
      where id = auth.uid() and agency_id is not null
    )
  );

-- 3. Mensagens
create table messages (
  id                uuid primary key default uuid_generate_v4(),
  conversation_id   uuid not null references conversations on delete cascade,
  zaptos_message_id text unique,
  from_me           boolean not null default false,
  content           text,
  type              text not null default 'text'
    check (type in ('text', 'image', 'audio', 'video', 'document', 'sticker', 'other')),
  media_url         text,
  status            text not null default 'pending'
    check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  timestamp         timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index messages_conversation_time_idx
  on messages(conversation_id, timestamp);

alter table messages enable row level security;

create policy "members can manage messages"
  on messages for all
  using (
    conversation_id in (
      select id from conversations
      where agency_id in (
        select agency_id from profiles
        where id = auth.uid() and agency_id is not null
      )
    )
  );
