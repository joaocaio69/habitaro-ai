-- Rastreia quando o deal mudou de etapa (para detectar gargalos)
alter table deals add column if not exists stage_changed_at timestamptz;

-- Inicializa com updated_at para deals existentes
update deals set stage_changed_at = updated_at where stage_changed_at is null;

alter table deals alter column stage_changed_at set not null;
alter table deals alter column stage_changed_at set default now();
