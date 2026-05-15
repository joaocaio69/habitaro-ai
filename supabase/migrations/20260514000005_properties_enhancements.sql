-- ============================================================
-- HABITARO AI — Properties enhancements
-- ============================================================

-- 1. Exclusividade no imóvel
alter table properties add column if not exists is_exclusive boolean not null default false;

-- 2. Políticas faltantes em property_images
create policy "Deletar imagens" on property_images
  for delete using (
    exists (select 1 from properties where id = property_id and agency_id = my_agency_id())
  );

create policy "Atualizar imagens" on property_images
  for update using (
    exists (select 1 from properties where id = property_id and agency_id = my_agency_id())
  );

-- 3. Storage bucket para fotos dos imóveis (público)
insert into storage.buckets (id, name, public)
  values ('property-images', 'property-images', true)
  on conflict (id) do nothing;

create policy "Authenticated upload property images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images');

create policy "Public view property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "Authenticated delete property images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'property-images');

-- 4. Vinculação de leads interessados em imóveis
create table if not exists client_property_interests (
  client_id   uuid not null references clients on delete cascade,
  property_id uuid not null references properties on delete cascade,
  notes       text,
  created_at  timestamptz not null default now(),
  primary key (client_id, property_id)
);

create index if not exists cpi_client_idx   on client_property_interests (client_id);
create index if not exists cpi_property_idx on client_property_interests (property_id);

alter table client_property_interests enable row level security;

create policy "Interesses da agência" on client_property_interests
  for select using (
    exists (select 1 from clients where id = client_id and agency_id = my_agency_id())
  );

create policy "Criar interesse" on client_property_interests
  for insert with check (
    exists (select 1 from clients where id = client_id and agency_id = my_agency_id())
  );

create policy "Remover interesse" on client_property_interests
  for delete using (
    exists (select 1 from clients where id = client_id and agency_id = my_agency_id())
  );
