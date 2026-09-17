begin;

create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  name text not null default '',
  category text not null default '',
  colors jsonb not null default '[]'::jsonb,
  forbidden_terms text[] not null default '{}',
  logo_asset_id uuid,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  category text not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  workspace_id uuid not null,
  revision integer not null check (revision > 0),
  price numeric(14, 2),
  currency text not null default 'KRW',
  confirmed_facts jsonb not null check (jsonb_typeof(confirmed_facts) = 'array'),
  source_url text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (product_id, workspace_id) references public.products(id, workspace_id) on delete cascade,
  unique (product_id, revision),
  unique (id, workspace_id)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('product_original', 'product_cutout', 'background', 'creative_png', 'export_zip', 'logo', 'metric_csv')),
  storage_path text not null unique,
  sha256 text,
  mime_type text not null,
  width integer check (width is null or width between 1 and 6000),
  height integer check (height is null or height between 1 and 6000),
  bytes bigint not null check (bytes between 1 and 10485760),
  rights_status text not null default 'user_confirmed' check (rights_status in ('user_confirmed', 'unknown', 'blocked')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id)
);

alter table public.brands
  add constraint brands_logo_workspace_fk
  foreign key (logo_asset_id, workspace_id) references public.assets(id, workspace_id);

create table public.product_assets (
  product_version_id uuid not null,
  asset_id uuid not null,
  workspace_id uuid not null,
  position smallint not null check (position between 0 and 4),
  primary key (product_version_id, asset_id),
  foreign key (product_version_id, workspace_id) references public.product_versions(id, workspace_id) on delete cascade,
  foreign key (asset_id, workspace_id) references public.assets(id, workspace_id) on delete restrict,
  unique (product_version_id, position)
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

create or replace function public.create_initial_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces(name)
  values (coalesce(nullif(split_part(new.email, '@', 1), ''), 'Growth workspace'))
  returning id into new_workspace_id;

  insert into public.workspace_members(workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  insert into public.brands(workspace_id) values (new_workspace_id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_initial_workspace();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_versions enable row level security;
alter table public.assets enable row level security;
alter table public.product_assets enable row level security;

create policy workspace_select on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy workspace_update on public.workspaces for update to authenticated using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));
create policy member_select on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));
create policy brand_all on public.brands for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy product_all on public.products for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy product_version_all on public.product_versions for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy asset_all on public.assets for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy product_asset_all on public.product_assets for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-assets', 'private-assets', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'text/csv', 'application/zip'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy private_asset_select on storage.objects for select to authenticated
using (bucket_id = 'private-assets' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
create policy private_asset_insert on storage.objects for insert to authenticated
with check (bucket_id = 'private-assets' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
create policy private_asset_update on storage.objects for update to authenticated
using (bucket_id = 'private-assets' and public.is_workspace_member((storage.foldername(name))[1]::uuid))
with check (bucket_id = 'private-assets' and public.is_workspace_member((storage.foldername(name))[1]::uuid));
create policy private_asset_delete on storage.objects for delete to authenticated
using (bucket_id = 'private-assets' and public.is_workspace_member((storage.foldername(name))[1]::uuid));

commit;
