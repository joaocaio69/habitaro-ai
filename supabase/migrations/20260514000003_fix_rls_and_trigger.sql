-- ============================================================
-- FIX 1: Trigger handle_new_user com search_path explícito
-- Sem isso o Supabase não encontra a tabela public.profiles
-- quando o trigger roda no contexto do schema auth.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

-- ============================================================
-- FIX 2: Política SELECT para que usuário veja o próprio perfil
-- mesmo antes de ter uma agência vinculada (agency_id = null).
-- A policy antiga só funciona quando agency_id IS NOT NULL.
-- ============================================================
drop policy if exists "Perfis visíveis na mesma agência" on profiles;

create policy "Usuário vê próprio perfil" on profiles
  for select using (id = auth.uid());

create policy "Perfis visíveis na mesma agência" on profiles
  for select using (agency_id is not null and agency_id = my_agency_id());

-- ============================================================
-- FIX 3: Política INSERT para agencies
-- Qualquer usuário autenticado pode criar uma agência
-- (isso é o onboarding — quem não tem agência ainda).
-- ============================================================
create policy "Usuário autenticado cria agência" on agencies
  for insert with check (auth.uid() is not null);

-- ============================================================
-- FIX 4: Política INSERT para profiles
-- Necessário para casos de recriar perfil manualmente.
-- O trigger usa security definer (bypass RLS), mas protege
-- contra inserção direta não autorizada.
-- ============================================================
create policy "Usuário insere próprio perfil" on profiles
  for insert with check (id = auth.uid());
