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
