-- email_logs 테이블 생성
-- 주의: 기존 프로젝트 컬럼명 규칙(camelCase)을 따름

create table if not exists public.email_logs (
  id               uuid        primary key default gen_random_uuid(),
  "siteId"         text,
  "estimateId"     text,
  "recipientEmail" text        not null,
  "recipientName"  text,
  subject          text        not null,
  "sendType"       text        not null default 'estimate',
  status           text        not null default 'pending',
  "errorMessage"   text,
  "sentAt"         timestamptz not null default now()
);

-- RLS 활성화 + 전체 허용 (기존 테이블과 동일한 방식)
alter table public.email_logs enable row level security;

create policy "email_logs_all"
  on public.email_logs
  for all
  using (true)
  with check (true);
