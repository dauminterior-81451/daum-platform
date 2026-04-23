-- ① Storage 버킷 생성 (public)
insert into storage.buckets (id, name, public)
  values ('materials', 'materials', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('drawings', 'drawings', true)
  on conflict (id) do nothing;

-- ② material_files 테이블
create table if not exists public.material_files (
  id              text        not null primary key,
  "siteId"        text        not null,
  name            text        not null,
  url             text        not null,
  "storagePath"   text        not null,
  "fileType"      text        not null default '',
  size            bigint      not null default 0,
  memo            text        not null default '',
  "createdAt"     text        not null
);

alter table public.material_files enable row level security;

create policy "material_files_all"
  on public.material_files
  for all using (true) with check (true);

-- ③ drawing_files 테이블
create table if not exists public.drawing_files (
  id              text        not null primary key,
  "siteId"        text        not null,
  name            text        not null,
  url             text        not null,
  "storagePath"   text        not null,
  "fileType"      text        not null default '',
  size            bigint      not null default 0,
  "createdAt"     text        not null
);

alter table public.drawing_files enable row level security;

create policy "drawing_files_all"
  on public.drawing_files
  for all using (true) with check (true);

-- ④ Storage RLS (버킷 공개 읽기 + 인증 없이 업로드 허용)
create policy "materials_public_read"
  on storage.objects for select
  using (bucket_id = 'materials');

create policy "materials_upload"
  on storage.objects for insert
  with check (bucket_id = 'materials');

create policy "materials_delete"
  on storage.objects for delete
  using (bucket_id = 'materials');

create policy "drawings_public_read"
  on storage.objects for select
  using (bucket_id = 'drawings');

create policy "drawings_upload"
  on storage.objects for insert
  with check (bucket_id = 'drawings');

create policy "drawings_delete"
  on storage.objects for delete
  using (bucket_id = 'drawings');
