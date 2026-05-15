-- Função SECURITY DEFINER para criar agência no onboarding.
-- Bypassa RLS (roda como owner do banco), mas valida auth.uid() internamente.
create or replace function create_agency_for_user(
  p_name     text,
  p_cnpj     text    default null,
  p_phone    text    default null,
  p_city     text    default null,
  p_state    text    default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_agency_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from profiles where id = auth.uid() and agency_id is not null
  ) then
    raise exception 'User already has an agency';
  end if;

  insert into agencies (name, cnpj, phone, city, state)
  values (p_name, p_cnpj, p_phone, p_city, p_state)
  returning id into v_agency_id;

  update profiles
  set agency_id = v_agency_id, role = 'admin'
  where id = auth.uid();

  return v_agency_id;
end;
$$;
