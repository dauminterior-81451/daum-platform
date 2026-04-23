-- settlements 테이블에 startup(착수금) 컬럼 추가
-- 기존 deposit/interim/balance와 동일한 jsonb 구조

alter table public.settlements
  add column if not exists startup jsonb not null default '{"amount":0,"ratio":0.4,"scheduledDate":"","paidDate":"","paid":false}'::jsonb;
