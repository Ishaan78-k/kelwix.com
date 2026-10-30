-- Run this whole file once in Supabase: Dashboard > SQL Editor > New query > Run

-- 1) Posts table (sarees + offers)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('saree','offer')),
  title text not null check (char_length(title) between 1 and 80),
  price text check (char_length(price) <= 40),
  badge text check (char_length(badge) <= 20),
  description text check (char_length(description) <= 300),
  image_url text,
  image_path text,
  expires_at date,
  created_at timestamptz not null default now()
);
create index if not exists posts_type_created on public.posts (type, created_at desc);

-- 2) Owners table: only users listed here can post. Nobody can read it from the browser.
create table if not exists public.owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.owners enable row level security;   -- no policies = no access

create or replace function public.is_owner() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.owners where user_id = auth.uid());
$$;

-- 3) Row Level Security on posts: everyone reads, only owners write
alter table public.posts enable row level security;
drop policy if exists "public read" on public.posts;
drop policy if exists "owner insert" on public.posts;
drop policy if exists "owner update" on public.posts;
drop policy if exists "owner delete" on public.posts;
create policy "public read"  on public.posts for select using (true);
create policy "owner insert" on public.posts for insert to authenticated with check (public.is_owner());
create policy "owner update" on public.posts for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owner delete" on public.posts for delete to authenticated using (public.is_owner());

-- 4) Image storage bucket (public read, 5 MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('saree-images','saree-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "images public read" on storage.objects;
drop policy if exists "images owner insert" on storage.objects;
drop policy if exists "images owner update" on storage.objects;
drop policy if exists "images owner delete" on storage.objects;
create policy "images public read"  on storage.objects for select using (bucket_id = 'saree-images');
create policy "images owner insert" on storage.objects for insert to authenticated with check (bucket_id = 'saree-images' and public.is_owner());
create policy "images owner update" on storage.objects for update to authenticated using (bucket_id = 'saree-images' and public.is_owner());
create policy "images owner delete" on storage.objects for delete to authenticated using (bucket_id = 'saree-images' and public.is_owner());

-- 5) AFTER creating the owner user in Authentication > Users, run (replace the email):
-- insert into public.owners (user_id) select id from auth.users where email = 'owner@example.com';
