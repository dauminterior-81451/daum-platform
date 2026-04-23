-- sites 테이블 status 컬럼 리팩토링
-- 기존: '진행중' | '완료' | '보류'
-- 변경: 'pre_contract' | 'in_progress' | 'completed'

-- 1. 기존 데이터 상태값 변환
UPDATE public.sites SET status = 'in_progress'  WHERE status = '진행중';
UPDATE public.sites SET status = 'completed'    WHERE status = '완료';
UPDATE public.sites SET status = 'pre_contract' WHERE status = '보류';

-- 2. 기본값 변경
ALTER TABLE public.sites ALTER COLUMN status SET DEFAULT 'pre_contract';
