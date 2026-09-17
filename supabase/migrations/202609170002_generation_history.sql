begin;

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_version_id uuid not null,
  idempotency_key uuid not null,
  input_hash text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  provider text,
  model text,
  prompt_version text not null,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (product_version_id, workspace_id) references public.product_versions(id, workspace_id) on delete restrict,
  unique (workspace_id, idempotency_key),
  unique (id, workspace_id)
);

create index generation_jobs_workspace_created_idx on public.generation_jobs(workspace_id, created_at desc);

create table public.creative_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  generation_job_id uuid not null,
  product_version_id uuid not null,
  trend_snapshot jsonb,
  created_at timestamptz not null default now(),
  foreign key (generation_job_id, workspace_id) references public.generation_jobs(id, workspace_id) on delete cascade,
  foreign key (product_version_id, workspace_id) references public.product_versions(id, workspace_id) on delete restrict,
  unique (generation_job_id),
  unique (id, workspace_id)
);

create table public.creative_variants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  creative_set_id uuid not null,
  variant_key text not null check (variant_key in ('A', 'B', 'C')),
  headline text not null check (char_length(headline) between 1 and 80),
  supporting_copy text not null check (char_length(supporting_copy) between 1 and 120),
  cta text not null check (char_length(cta) between 1 and 30),
  trend_reason text not null check (char_length(trend_reason) between 1 and 200),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  foreign key (creative_set_id, workspace_id) references public.creative_sets(id, workspace_id) on delete cascade,
  unique (creative_set_id, variant_key),
  unique (id, workspace_id)
);

alter table public.generation_jobs enable row level security;
alter table public.creative_sets enable row level security;
alter table public.creative_variants enable row level security;

create policy generation_job_all on public.generation_jobs for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy creative_set_all on public.creative_sets for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy creative_variant_all on public.creative_variants for all to authenticated
using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create or replace function public.reserve_generation(
  target_workspace_id uuid,
  target_product_version_id uuid,
  requested_idempotency_key uuid,
  requested_input_hash text,
  requested_prompt_version text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_job_id uuid;
  new_job_id uuid;
  weekly_jobs integer;
begin
  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'WORKSPACE_FORBIDDEN' using errcode = '42501';
  end if;

  select id into existing_job_id from public.generation_jobs
  where workspace_id = target_workspace_id and idempotency_key = requested_idempotency_key;
  if existing_job_id is not null then return existing_job_id; end if;

  select count(*) into weekly_jobs from public.generation_jobs
  where workspace_id = target_workspace_id
    and created_at >= date_trunc('week', now())
    and status in ('queued', 'running', 'succeeded');
  if weekly_jobs >= 5 then raise exception 'WEEKLY_QUOTA_EXCEEDED' using errcode = 'P0001'; end if;

  insert into public.generation_jobs (
    workspace_id, product_version_id, idempotency_key, input_hash, status, prompt_version, started_at
  ) values (
    target_workspace_id, target_product_version_id, requested_idempotency_key, requested_input_hash,
    'running', requested_prompt_version, now()
  ) returning id into new_job_id;
  return new_job_id;
end;
$$;

create or replace function public.complete_generation(
  target_job_id uuid,
  result_provider text,
  result_model text,
  result_trend jsonb,
  result_variants jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_job public.generation_jobs%rowtype;
  new_set_id uuid;
  item jsonb;
begin
  select * into target_job from public.generation_jobs where id = target_job_id for update;
  if target_job.id is null or not public.is_workspace_member(target_job.workspace_id) then
    raise exception 'GENERATION_FORBIDDEN' using errcode = '42501';
  end if;
  if target_job.status = 'succeeded' then
    select id into new_set_id from public.creative_sets where generation_job_id = target_job.id;
    return new_set_id;
  end if;
  if jsonb_typeof(result_variants) <> 'array' or jsonb_array_length(result_variants) <> 3 then
    raise exception 'INVALID_VARIANTS' using errcode = '22023';
  end if;

  insert into public.creative_sets (workspace_id, generation_job_id, product_version_id, trend_snapshot)
  values (target_job.workspace_id, target_job.id, target_job.product_version_id, result_trend)
  returning id into new_set_id;

  for item in select value from jsonb_array_elements(result_variants)
  loop
    insert into public.creative_variants (
      workspace_id, creative_set_id, variant_key, headline, supporting_copy, cta, trend_reason
    ) values (
      target_job.workspace_id, new_set_id, item->>'id', item->>'headline', item->>'subline', item->>'cta', item->>'trendReason'
    );
  end loop;

  update public.generation_jobs set status = 'succeeded', provider = result_provider,
    model = result_model, completed_at = now() where id = target_job.id;
  return new_set_id;
end;
$$;

create or replace function public.get_weekly_generation_usage(target_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare usage_count integer;
begin
  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'WORKSPACE_FORBIDDEN' using errcode = '42501';
  end if;
  select count(*) into usage_count from public.generation_jobs
  where workspace_id = target_workspace_id
    and created_at >= date_trunc('week', now())
    and status in ('queued', 'running', 'succeeded');
  return usage_count;
end;
$$;

revoke all on function public.reserve_generation(uuid, uuid, uuid, text, text) from public;
revoke all on function public.complete_generation(uuid, text, text, jsonb, jsonb) from public;
revoke all on function public.get_weekly_generation_usage(uuid) from public;
grant execute on function public.reserve_generation(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.complete_generation(uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.get_weekly_generation_usage(uuid) to authenticated;

commit;
