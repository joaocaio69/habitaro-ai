-- Adiciona campos de perfil de interesse ao cliente
alter table clients
  add column if not exists preferred_type       text,
  add column if not exists preferred_location   text,
  add column if not exists preferred_bedrooms   smallint;
