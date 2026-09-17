begin;

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'workspace' check (scope = 'workspace'),
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (workspace_id, status)
);

alter table public.deletion_requests enable row level security;
create policy deletion_request_select on public.deletion_requests for select to authenticated
using (public.is_workspace_member(workspace_id));
create policy deletion_request_insert on public.deletion_requests for insert to authenticated
with check (public.is_workspace_member(workspace_id) and requested_by = auth.uid());

create or replace function public.request_workspace_deletion(target_workspace_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare request_id uuid;
begin
  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'WORKSPACE_FORBIDDEN' using errcode = '42501';
  end if;
  update public.workspaces set status = 'deleting', updated_at = now() where id = target_workspace_id;
  insert into public.deletion_requests(workspace_id, requested_by)
  values (target_workspace_id, auth.uid())
  on conflict (workspace_id, status) do update set requested_at = excluded.requested_at
  returning id into request_id;
  return request_id;
end;
$$;

revoke all on function public.request_workspace_deletion(uuid) from public;
grant execute on function public.request_workspace_deletion(uuid) to authenticated;

commit;
