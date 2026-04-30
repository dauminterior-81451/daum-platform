나는 박대표 (다움인테리어 대전 운영).
인테리어 업무관리 플랫폼을 Claude Code로 개발 중이야.

[프로젝트 정보]
- 배포 주소: https://daum-platform.vercel.app
- GitHub: github.com/dauminterior-81451/daum-platform
- 로컬: C:\Users\User\Desktop\daum-platform (포트 3002)
- DB: Supabase (flakzntmptpmflznqnzz)
- 스택: Next.js 16, Tailwind CSS, TypeScript, Supabase

[완성된 기능]
- 현장관리 (등록/수정/삭제), 상태 3단계 (계약전/진행중/완료)
- 견적서 (작성/저장/차수관리/미리보기/PDF/이메일발송)
- 입금/정산 (계약금/착수금/중도금/잔금 4단계 + 추가금)
- 자재관리 (수기입력 + 파일/이미지 첨부) — 단가/수량/금액 없음, 품목명+메모만
- 도면관리 (파일 업로드/다운로드)
- AS관리
- 대시보드 (settlements 기준 총입금액/미수금 + 마진 현황 카드 3개)
- 발송 이력
- 로그인 (Supabase Auth)
- 고객 전용 페이지 (/client/[siteId]) - 탭구조 (홈/공정/자재/도면/입금/문의)
- 공정관리 (FullCalendar 캘린더, 날짜클릭 추가, 드래그)
- 모바일 반응형
- 고객 문의 등록/답변 정상화
- 관리자 현장 상세 고객링크 복사 버튼
- 지출관리 탭 (현장 상세)
  - 발주자재 / 인건비 / 기타잡비 항목별 입력/수정/삭제
  - 품목(category) + 항목명 + 금액(천단위 콤마) + 지출일 + 메모
  - 손익 요약 카드: 견적금액(부가세제외) / 총지출(-) / 예상마진 / 실현마진
  - 예상마진 = 계약총액(부가세제외) - 총지출
  - 실현마진 = 실제수금액 - 총지출
  - 입금현황 섹션 (읽기전용): 계약금/착수금/중도금/잔금 완료여부 표시
- 대시보드 마진 현황 카드 3개 (총지출 / 예상마진 / 실현마진)
- Supabase 클라이언트 싱글톤 패턴 수정 (중복 인스턴스 오류 해결)

[DB]
- site_expenses 테이블 (id, siteId, type, category, description, amount, date, memo)
  - type: 'labor' | 'misc' | 'material'
- materials 테이블 — category 컬럼 추가
- site_expenses 테이블 — category 컬럼 추가

[보류/제외 기능]
- SMS 자동 발송 → 보류 (고객 페이지에서 입금일정 확인으로 대체)
- 고객 만족도 평가 → 제외

[다음 할 일 - 우선순위]
1. 대시보드 현장별 마진 상세 드릴다운
2. 지출 데이터 기반 월별/현장별 통계
3. 고객 페이지 공정 사진 업로드

[개발 규칙]
- 배포 확인은 항상 https://daum-platform.vercel.app 에서
- 작업 후 항상 git add . → git commit → git push
- Claude Code 프롬프트: [공통조건]/[작업]/[범위]/[출력] 형식
- 항상 PowerShell 배포 명령어도 같이 줄 것
- 답변은 요점만 간결하게

# 모델 라우팅 규칙

## Haiku 4.5 (빠른 작업)
- 변수명/컬럼명 오타 수정
- 주석 추가, 포맷팅, import 정리
- 텍스트/라벨 문구 변경
- CSS 색상/여백 미세조정
- CLAUDE_CONTEXT.md 업데이트

## Sonnet 4.6 (일반 개발) ← 기본값
- 새 컴포넌트/탭/섹션 추가
- 버그 수정 (단일 파일)
- DB 쿼리 로직 수정
- 폼 입력/저장/삭제 기능
- Supabase RLS/정책 작업
- 고객 페이지 기능 추가

## Opus 4.7 (복잡한 작업)
- 멀티테넌트 구조 설계 (SaaS화)
- 여러 파일 동시 수정
- 인증/보안 관련 작업
- 마진 계산 로직 전면 개편
- 결제 연동 (요금제/구독)
- 2시간 이상 해결 안 되는 버그

## 작업 시작 전 체크리스트
1. SaaS 구조 변경이나 보안 관련인가? → Opus
2. 여러 파일(3개 이상) 동시 수정인가? → Opus
3. 새 기능/컴포넌트/버그 수정인가? → Sonnet (대부분 여기)
4. 문구/색상/주석 수준인가? → Haiku

## 단계별 가이드
- 지금 (기능 개발): Sonnet 기본
- 다음 (완성도/UX): Sonnet
- SaaS 전환: Opus
