# 현장별 지출 관리 & 손익 계산 설계

## 개요

현장별 인건비/기타잡비 입력 기능을 추가하고, 자재비(기존 materials 테이블 집계)와 합산하여
예상마진·실현마진을 자동 계산한다. 현장 상세 페이지와 대시보드에 손익 현황을 표시한다.

---

## 1. DB 스키마

### 신규 테이블: `site_expenses`

| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | text | PK |
| siteId | text | 현장 ID (FK: sites.id) |
| type | text | 'labor' (인건비) \| 'misc' (기타잡비) |
| description | text | 항목명 (예: "도배 인건비") |
| amount | int8 | 금액 (원) |
| date | text | 지출일 (YYYY-MM-DD) |
| memo | text | 비고 (선택) |

자재비는 기존 `materials` 테이블에서 `qty * unitPrice` 합산으로 자동 집계. 별도 저장 없음.

---

## 2. 타입 정의 (`storage.ts`)

```ts
export interface SiteExpense {
  id: string
  siteId: string
  type: 'labor' | 'misc'
  description: string
  amount: number
  date: string
  memo: string
}
```

`storage.siteExpenses` 추가:
- `listBySite(siteId)` — siteId 필터, date 오름차순
- `upsert(item)` — 추가/수정
- `remove(id)` — 삭제

---

## 3. 현장 상세 — "지출관리" 탭

### 탭 위치
기존 TABS 배열에 '지출관리' 추가: `['견적서', '입금/정산', '자재관리', '도면', 'AS관리', '공정관리', '지출관리', '고객페이지']`

잠금 조건: `pre_contract` 상태에서는 잠금 (`LOCKED_ON_PRE_CONTRACT`에 추가).

### 탭 내부 구성

#### 손익 요약 카드 (상단)
3열 그리드:
- 총지출 = 자재비 + 인건비 합계 + 기타잡비 합계
- 예상마진 = 계약총액 - 총지출 (양수: 초록, 음수: 빨강)
- 실현마진 = 실제수금액 - 총지출 (양수: 초록, 음수: 빨강)
- 마진율 = 예상마진 ÷ 계약총액 × 100 (계약총액 0이면 표시 생략)

데이터 로딩: `settlement`, `materials`, `siteExpenses` 3개를 병렬로 fetch.

#### 자재비 섹션 (읽기 전용)
- materials 테이블 합계 자동 표시
- "자재관리 탭에서 수정" 안내 링크

#### 인건비 섹션
- 항목 목록 (description, amount, date, memo)
- [+ 추가] 버튼 → 모달 (description*, amount, date, memo)
- 수정/삭제 버튼

#### 기타잡비 섹션
- 인건비와 동일한 구조, type='misc'

---

## 4. 대시보드 — 마진 현황 추가

기존 카드 4개 + 미수금 카드 아래에 마진 현황 섹션 추가.

3열 카드:
- **총지출**: 전체 현장 (자재비 + 인건비 + 기타잡비) 합산
- **예상마진**: 전체 계약총액 - 전체 총지출
- **실현마진**: 전체 수금액 - 전체 총지출

마진율은 예상마진 카드 하단에 표시 (전체 계약총액 대비 %).

데이터 로딩: 기존 Promise.all에 `storage.siteExpenses` 전체 목록 + `storage.materials` 전체 목록 추가.

---

## 5. 마진 계산 공통 로직

```
자재비(siteId)    = materials.filter(siteId).reduce(qty * unitPrice)
인건비(siteId)    = siteExpenses.filter(siteId, type=labor).reduce(amount)
기타잡비(siteId)  = siteExpenses.filter(siteId, type=misc).reduce(amount)
총지출(siteId)    = 자재비 + 인건비 + 기타잡비

수금액(siteId)    = settlement의 paid 단계 합계 (기존 calcSettlementPaid 함수 재사용, extra_payments 제외 — 대시보드 기존 로직과 일치)
계약총액(siteId)  = settlement.contractTotal (없으면 최신 견적서 기준)

예상마진(siteId)  = 계약총액 - 총지출
실현마진(siteId)  = 수금액 - 총지출
```

---

## 6. 구현 범위

1. Supabase SQL로 `site_expenses` 테이블 생성
2. `storage.ts` — SiteExpense 타입 + siteExpenses CRUD 추가
3. `app/sites/[id]/page.tsx` — ExpenseTab 컴포넌트 추가, TABS/LOCKED 배열 수정
4. `app/dashboard/page.tsx` — 마진 현황 카드 3개 추가
5. git push → Vercel 자동 배포

## 7. 제외 범위

- 지출 항목 CSV 내보내기
- 지출 카테고리 세분화 (추후 확장 가능)
- 과거 자재관리 데이터 마이그레이션 (이미 호환됨)
