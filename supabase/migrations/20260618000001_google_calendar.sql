-- Google Calendar OAuth tokens por usuário
create table google_calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade unique,
  agency_id     uuid not null references agencies on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  calendar_id   text not null default 'primary',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger google_calendar_connections_updated_at
  before update on google_calendar_connections
  for each row execute function update_updated_at();

alter table google_calendar_connections enable row level security;

create policy "Usuário vê sua própria conexão" on google_calendar_connections
  for select using (user_id = auth.uid());

create policy "Usuário gerencia sua própria conexão" on google_calendar_connections
  for all using (user_id = auth.uid());

-- Coluna para rastrear o evento criado no Google Calendar
alter table activities add column if not exists google_event_id text;
alter table activities add column if not exists google_calendar_user_id uuid references auth.users on delete set null;
