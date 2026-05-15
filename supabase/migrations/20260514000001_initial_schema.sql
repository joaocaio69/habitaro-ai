-- ============================================================
-- HABITARO AI — Schema inicial
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- Helper: atualiza updated_at automaticamente
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. AGENCIES (imobiliárias) — multi-tenant
-- ============================================================
create table agencies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  cnpj        text unique,
  logo_url    text,
  phone       text,
  email       text,
  address     text,
  city        text,
  state       char(2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger agencies_updated_at
  before update on agencies
  for each row execute function update_updated_at();

-- ============================================================
-- 2. PROFILES (corretores / admins)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  agency_id   uuid references agencies on delete set null,
  full_name   text not null,
  phone       text,
  creci       text,                          -- registro profissional
  avatar_url  text,
  role        text not null default 'broker' check (role in ('admin', 'broker', 'manager')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_agency_id_idx on profiles (agency_id);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Cria profile automaticamente ao criar usuário no auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- 3. CLIENTS (leads e clientes)
-- ============================================================
create type client_intent  as enum ('buy', 'rent', 'sell', 'buy_and_sell');
create type client_status  as enum ('lead', 'active', 'inactive', 'converted', 'lost');
create type lead_source    as enum (
  'referral', 'portal', 'instagram', 'facebook', 'google',
  'whatsapp', 'cold_call', 'event', 'other'
);

create table clients (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid not null references agencies on delete cascade,
  broker_id     uuid references profiles on delete set null,
  full_name     text not null,
  email         text,
  phone         text,
  cpf           text,
  intent        client_intent,
  status        client_status not null default 'lead',
  source        lead_source,
  budget_min    numeric(14,2),
  budget_max    numeric(14,2),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index clients_agency_id_idx  on clients (agency_id);
create index clients_broker_id_idx  on clients (broker_id);
create index clients_status_idx     on clients (status);
create index clients_full_name_idx  on clients using gin (to_tsvector('portuguese', full_name));

create trigger clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

-- ============================================================
-- 4. TAGS (etiquetas para segmentação)
-- ============================================================
create table tags (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references agencies on delete cascade,
  name        text not null,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  unique (agency_id, name)
);

create table client_tags (
  client_id   uuid not null references clients on delete cascade,
  tag_id      uuid not null references tags on delete cascade,
  primary key (client_id, tag_id)
);

-- ============================================================
-- 5. PROPERTY_TYPES (tipo de imóvel)
-- ============================================================
create table property_types (
  id    smallint primary key generated always as identity,
  name  text not null unique   -- Apartamento, Casa, Terreno, Comercial...
);

insert into property_types (name) values
  ('Apartamento'), ('Casa'), ('Casa de Condomínio'), ('Terreno'),
  ('Sala Comercial'), ('Loja'), ('Galpão'), ('Fazenda'), ('Sítio'), ('Outro');

-- ============================================================
-- 6. PROPERTIES (imóveis)
-- ============================================================
create type transaction_type  as enum ('sale', 'rent', 'sale_or_rent');
create type property_status   as enum (
  'available', 'negotiating', 'sold', 'rented', 'inactive', 'capturing'
);

create table properties (
  id                  uuid primary key default uuid_generate_v4(),
  agency_id           uuid not null references agencies on delete cascade,
  broker_id           uuid references profiles on delete set null,  -- captador
  type_id             smallint references property_types,
  transaction_type    transaction_type not null default 'sale',
  status              property_status not null default 'available',

  -- Descrição
  title               text not null,
  description         text,
  internal_code       text,                           -- código interno da imobiliária

  -- Localização
  zip_code            text,
  address             text,
  number              text,
  complement          text,
  neighborhood        text,
  city                text,
  state               char(2),

  -- Valores
  price               numeric(14,2),
  condo_fee           numeric(10,2),
  iptu_yearly         numeric(10,2),

  -- Características
  area_total          numeric(10,2),                  -- m² total
  area_useful         numeric(10,2),                  -- m² útil
  bedrooms            smallint,
  suites              smallint,
  bathrooms           smallint,
  parking_spots       smallint,
  floor               smallint,
  total_floors        smallint,
  amenities           text[] default '{}',            -- piscina, academia, churrasqueira...

  -- Proprietário
  owner_name          text,
  owner_phone         text,
  owner_email         text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index properties_agency_id_idx     on properties (agency_id);
create index properties_broker_id_idx     on properties (broker_id);
create index properties_status_idx        on properties (status);
create index properties_transaction_idx   on properties (transaction_type);
create index properties_city_neighborhood on properties (city, neighborhood);
create index properties_price_idx         on properties (price);
create index properties_search_idx        on properties using gin (
  to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(neighborhood,''))
);

create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

-- ============================================================
-- 7. PROPERTY_IMAGES
-- ============================================================
create table property_images (
  id            uuid primary key default uuid_generate_v4(),
  property_id   uuid not null references properties on delete cascade,
  url           text not null,
  is_cover      boolean not null default false,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);

create index property_images_property_idx on property_images (property_id);

-- Garante apenas uma imagem de capa por imóvel
create unique index property_images_cover_idx
  on property_images (property_id)
  where is_cover = true;

-- ============================================================
-- 8. PIPELINE_STAGES (etapas do funil)
-- ============================================================
create table pipeline_stages (
  id          uuid primary key default uuid_generate_v4(),
  agency_id   uuid not null references agencies on delete cascade,
  name        text not null,
  sort_order  smallint not null default 0,
  color       text not null default '#6366f1',
  is_won      boolean not null default false,  -- estágio de ganho
  is_lost     boolean not null default false,  -- estágio de perda
  created_at  timestamptz not null default now()
);

create index pipeline_stages_agency_idx on pipeline_stages (agency_id, sort_order);

-- Estágios padrão são inseridos via função ao criar uma agency (ver trigger abaixo)
create or replace function create_default_pipeline_stages(p_agency_id uuid)
returns void language plpgsql as $$
begin
  insert into pipeline_stages (agency_id, name, sort_order, color, is_won, is_lost) values
    (p_agency_id, 'Novo Lead',          1, '#94a3b8', false, false),
    (p_agency_id, 'Qualificado',         2, '#3b82f6', false, false),
    (p_agency_id, 'Visita Agendada',     3, '#a855f7', false, false),
    (p_agency_id, 'Proposta Enviada',    4, '#f59e0b', false, false),
    (p_agency_id, 'Em Negociação',       5, '#f97316', false, false),
    (p_agency_id, 'Fechado — Ganho',     6, '#22c55e', true,  false),
    (p_agency_id, 'Fechado — Perdido',   7, '#ef4444', false, true);
end;
$$;

create or replace function on_agency_created()
returns trigger language plpgsql as $$
begin
  perform create_default_pipeline_stages(new.id);
  return new;
end;
$$;

create trigger agency_created_stages
  after insert on agencies
  for each row execute function on_agency_created();

-- ============================================================
-- 9. DEALS (negociações)
-- ============================================================
create type deal_status as enum ('open', 'won', 'lost', 'paused');

create table deals (
  id                    uuid primary key default uuid_generate_v4(),
  agency_id             uuid not null references agencies on delete cascade,
  client_id             uuid not null references clients on delete restrict,
  property_id           uuid references properties on delete set null,
  broker_id             uuid references profiles on delete set null,
  stage_id              uuid not null references pipeline_stages on delete restrict,
  status                deal_status not null default 'open',

  title                 text not null,
  value                 numeric(14,2),
  commission_pct        numeric(5,2),                    -- % de comissão
  commission_value      numeric(14,2),                   -- valor calculado

  expected_close_date   date,
  closed_at             timestamptz,
  lost_reason           text,
  notes                 text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index deals_agency_id_idx    on deals (agency_id);
create index deals_client_id_idx    on deals (client_id);
create index deals_broker_id_idx    on deals (broker_id);
create index deals_stage_id_idx     on deals (stage_id);
create index deals_status_idx       on deals (status);

create trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at();

-- ============================================================
-- 10. ACTIVITIES (atividades / tarefas)
-- ============================================================
create type activity_type   as enum ('call', 'visit', 'meeting', 'task', 'email', 'whatsapp', 'note');
create type activity_status as enum ('pending', 'completed', 'cancelled');

create table activities (
  id            uuid primary key default uuid_generate_v4(),
  agency_id     uuid not null references agencies on delete cascade,
  broker_id     uuid references profiles on delete set null,
  deal_id       uuid references deals on delete cascade,
  client_id     uuid references clients on delete cascade,
  property_id   uuid references properties on delete set null,

  type          activity_type not null,
  status        activity_status not null default 'pending',
  title         text not null,
  description   text,
  scheduled_at  timestamptz,
  completed_at  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint activities_has_context check (
    deal_id is not null or client_id is not null
  )
);

create index activities_agency_id_idx   on activities (agency_id);
create index activities_broker_id_idx   on activities (broker_id);
create index activities_deal_id_idx     on activities (deal_id);
create index activities_client_id_idx   on activities (client_id);
create index activities_scheduled_idx   on activities (scheduled_at) where status = 'pending';

create trigger activities_updated_at
  before update on activities
  for each row execute function update_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table agencies         enable row level security;
alter table profiles         enable row level security;
alter table clients          enable row level security;
alter table tags             enable row level security;
alter table client_tags      enable row level security;
alter table properties       enable row level security;
alter table property_images  enable row level security;
alter table pipeline_stages  enable row level security;
alter table deals            enable row level security;
alter table activities       enable row level security;

-- Helper: retorna agency_id do usuário autenticado
create or replace function my_agency_id()
returns uuid language sql stable security definer as $$
  select agency_id from profiles where id = auth.uid();
$$;

-- Helper: verifica se é admin ou manager
create or replace function is_manager()
returns boolean language sql stable security definer as $$
  select role in ('admin', 'manager') from profiles where id = auth.uid();
$$;

-- AGENCIES
create policy "Membros veem sua agência" on agencies
  for select using (id = my_agency_id());

create policy "Admins atualizam agência" on agencies
  for update using (id = my_agency_id() and is_manager());

-- PROFILES
create policy "Perfis visíveis na mesma agência" on profiles
  for select using (agency_id = my_agency_id());

create policy "Usuário edita próprio perfil" on profiles
  for update using (id = auth.uid());

-- CLIENTS
create policy "Clientes da agência" on clients
  for select using (agency_id = my_agency_id());

create policy "Criar clientes" on clients
  for insert with check (agency_id = my_agency_id());

create policy "Editar clientes" on clients
  for update using (
    agency_id = my_agency_id() and (broker_id = auth.uid() or is_manager())
  );

create policy "Deletar clientes (manager)" on clients
  for delete using (agency_id = my_agency_id() and is_manager());

-- PROPERTIES
create policy "Imóveis da agência" on properties
  for select using (agency_id = my_agency_id());

create policy "Criar imóveis" on properties
  for insert with check (agency_id = my_agency_id());

create policy "Editar imóveis" on properties
  for update using (
    agency_id = my_agency_id() and (broker_id = auth.uid() or is_manager())
  );

create policy "Deletar imóveis (manager)" on properties
  for delete using (agency_id = my_agency_id() and is_manager());

-- DEALS
create policy "Negociações da agência" on deals
  for select using (agency_id = my_agency_id());

create policy "Criar negociações" on deals
  for insert with check (agency_id = my_agency_id());

create policy "Editar negociações" on deals
  for update using (
    agency_id = my_agency_id() and (broker_id = auth.uid() or is_manager())
  );

-- PIPELINE STAGES
create policy "Etapas da agência" on pipeline_stages
  for select using (agency_id = my_agency_id());

create policy "Managers gerenciam etapas" on pipeline_stages
  for all using (agency_id = my_agency_id() and is_manager());

-- ACTIVITIES
create policy "Atividades da agência" on activities
  for select using (agency_id = my_agency_id());

create policy "Criar atividades" on activities
  for insert with check (agency_id = my_agency_id());

create policy "Editar atividades" on activities
  for update using (
    agency_id = my_agency_id() and (broker_id = auth.uid() or is_manager())
  );

-- TAGS
create policy "Tags da agência" on tags
  for select using (agency_id = my_agency_id());

create policy "Managers gerenciam tags" on tags
  for all using (agency_id = my_agency_id() and is_manager());

create policy "Client tags da agência" on client_tags
  for select using (
    exists (select 1 from clients where id = client_id and agency_id = my_agency_id())
  );

-- PROPERTY IMAGES
create policy "Imagens visíveis na agência" on property_images
  for select using (
    exists (select 1 from properties where id = property_id and agency_id = my_agency_id())
  );

create policy "Inserir imagens" on property_images
  for insert with check (
    exists (select 1 from properties where id = property_id and agency_id = my_agency_id())
  );
