# 현장 지출관리 & 손익 계산 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현장별 인건비/기타잡비 입력 탭을 추가하고, 자재비와 합산해 예상마진/실현마진을 계산하여 현장 상세 및 대시보드에 표시한다.

**Architecture:** Supabase에 `site_expenses` 테이블을 새로 생성하고, storage.ts에 CRUD를 추가한다. 현장 상세에 `ExpenseTab` 컴포넌트(별도 파일)를 추가하고, 대시보드에 전체 마진 카드 3개를 추가한다. 자재비는 기존 materials 테이블에서 자동 집계한다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase

---

## File Map

| 작업 | 파일 |
|------|------|
| 신규 생성 | `app/sites/[id]/ExpenseTab.tsx` |
| 수정 | `app/lib/storage.ts` — SiteExpense 타입 + siteExpenses CRUD |
| 수정 | `app/sites/[id]/page.tsx` — 탭 배열 + import + render |
| 수정 | `app/dashboard/page.tsx` — 마진 카드 3개 추가 |

---

### Task 1: Supabase 테이블 생성

**Files:**
- 없음 (Supabase 콘솔에서 직접 실행)

- [ ] **Step 1: Supabase SQL Editor에서 테이블 생성**

  https://supabase.com/dashboard/project/flakzntmptpmflznqnzz/sql 접속 후 아래 SQL 실행:

  ```sql
  create table site_expenses (
    id text primary key,
    "siteId" text not null,
    type text not null check (type in ('labor', 'misc')),
    description text not null,
    amount int8 not null default 0,
    date text not null,
    memo text not null default ''
  );
  ```

- [ ] **Step 2: 테이블 생성 확인**

  Table Editor에서 `site_expenses` 테이블이 보이면 완료.

---

### Task 2: storage.ts — SiteExpense 타입 및 CRUD 추가

**Files:**
- Modify: `app/lib/storage.ts`

- [ ] **Step 1: SiteExpense 인터페이스 추가**

  `app/lib/storage.ts`의 `EmailLog` 인터페이스 바로 위에 추가:

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

- [ ] **Step 2: storage 객체에 siteExpenses 추가**

  `storage` 객체의 `emailLogs:` 바로 위에 추가:

  ```ts
  siteExpenses: {
    list: (): Promise<SiteExpense[]> => select<SiteExpense>('site_expenses'),
    listBySite: async (siteId: string): Promise<SiteExpense[]> => {
      const { data, error } = await supabase
        .from('site_expenses')
        .select('*')
        .eq('siteId', siteId)
        .order('date', { ascending: true })
      if (error) console.error('[storage:site_expenses]', error)
      return (data ?? []) as SiteExpense[]
    },
    upsert: (item: SiteExpense) => upsertRow('site_expenses', item),
    remove: (id: string) => deleteRow('site_expenses', id),
  },
  ```

- [ ] **Step 3: TypeScript 오류 없는지 확인**

  ```bash
  cd C:/Users/User/Desktop/daum-platform
  npx tsc --noEmit
  ```

  오류 없으면 통과.

- [ ] **Step 4: 커밋**

  ```bash
  git add app/lib/storage.ts
  git commit -m "feat: SiteExpense 타입 및 storage CRUD 추가"
  ```

---

### Task 3: ExpenseTab 컴포넌트 생성

**Files:**
- Create: `app/sites/[id]/ExpenseTab.tsx`

- [ ] **Step 1: ExpenseTab.tsx 파일 생성**

  `app/sites/[id]/ExpenseTab.tsx` 를 아래 내용으로 생성:

  ```tsx
  'use client'

  import { useEffect, useState } from 'react'
  import { Material, Settlement, SiteExpense, newId, storage } from '../../lib/storage'

  type ExpenseType = 'labor' | 'misc'
  type ExpenseForm = { description: string; amount: number; date: string; memo: string }

  const defaultForm = (): ExpenseForm => ({
    description: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    memo: '',
  })

  function calcSettlementPaid(s: Settlement): number {
    return (['deposit', 'startup', 'interim', 'balance'] as const)
      .filter(k => s[k].paid)
      .reduce((sum, k) => sum + (s[k].amount || 0), 0)
  }

  function marginColor(val: number): string {
    return val >= 0 ? 'text-green-700' : 'text-red-600'
  }

  export default function ExpenseTab({ siteId }: { siteId: string }) {
    const [settlement, setSettlement] = useState<Settlement | null>(null)
    const [materials, setMaterials]   = useState<Material[]>([])
    const [expenses, setExpenses]     = useState<SiteExpense[]>([])
    const [show, setShow]             = useState(false)
    const [activeType, setActiveType] = useState<ExpenseType>('labor')
    const [editId, setEditId]         = useState<string | null>(null)
    const [form, setForm]             = useState<ExpenseForm>(defaultForm())

    useEffect(() => {
      Promise.all([
        storage.settlements.get(siteId),
        storage.materials.list(),
        storage.siteExpenses.listBySite(siteId),
      ]).then(([s, mats, exps]) => {
        setSettlement(s)
        setMaterials(mats.filter(m => m.siteId === siteId))
        setExpenses(exps)
      })
    }, [siteId])

    const materialCost   = materials.reduce((s, m) => s + m.qty * m.unitPrice, 0)
    const laborCost      = expenses.filter(e => e.type === 'labor').reduce((s, e) => s + e.amount, 0)
    const miscCost       = expenses.filter(e => e.type === 'misc').reduce((s, e) => s + e.amount, 0)
    const totalCost      = materialCost + laborCost + miscCost
    const contractTotal  = settlement?.contractTotal ?? 0
    const paidAmount     = settlement ? calcSettlementPaid(settlement) : 0
    const expectedMargin = contractTotal - totalCost
    const realizedMargin = paidAmount - totalCost
    const marginRate     = contractTotal > 0 ? Math.round((expectedMargin / contractTotal) * 100) : null

    function openAdd(type: ExpenseType) {
      setActiveType(type)
      setEditId(null)
      setForm(defaultForm())
      setShow(true)
    }

    function openEdit(exp: SiteExpense) {
      setActiveType(exp.type)
      setEditId(exp.id)
      setForm({ description: exp.description, amount: exp.amount, date: exp.date, memo: exp.memo })
      setShow(true)
    }

    async function handleSave(e: React.FormEvent) {
      e.preventDefault()
      if (!form.description.trim()) return
      if (editId) {
        const updated: SiteExpense = { ...expenses.find(x => x.id === editId)!, ...form, type: activeType }
        await storage.siteExpenses.upsert(updated)
        setExpenses(prev => prev.map(x => x.id === editId ? updated : x))
      } else {
        const item: SiteExpense = { id: newId(), siteId, type: activeType, ...form }
        await storage.siteExpenses.upsert(item)
        setExpenses(prev => [...prev, item])
      }
      setShow(false)
    }

    async function handleDelete(id: string) {
      if (!confirm('삭제하시겠습니까?')) return
      await storage.siteExpenses.remove(id)
      setExpenses(prev => prev.filter(x => x.id !== id))
    }

    return (
      <div className="space-y-4">
        {/* 손익 요약 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">총 지출</p>
            <p className="text-sm font-bold text-slate-700">{totalCost.toLocaleString()}원</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${expectedMargin >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className="text-xs text-slate-400 mb-1">예상 마진</p>
            <p className={`text-sm font-bold ${marginColor(expectedMargin)}`}>{expectedMargin.toLocaleString()}원</p>
            {marginRate !== null && (
              <p className="text-xs text-slate-400 mt-0.5">{marginRate}%</p>
            )}
          </div>
          <div className={`rounded-xl p-3 text-center ${realizedMargin >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
            <p className="text-xs text-slate-400 mb-1">실현 마진</p>
            <p className={`text-sm font-bold ${marginColor(realizedMargin)}`}>{realizedMargin.toLocaleString()}원</p>
          </div>
        </div>

        {/* 자재비 (자동 집계) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-orange-50 border-orange-100">
            <span className="text-sm font-semibold text-slate-700">자재비</span>
            <span className="text-xs text-slate-400">자재관리 탭에서 수정</span>
          </div>
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-500">{materials.length}건</span>
            <span className="text-sm font-bold text-orange-600">{materialCost.toLocaleString()}원</span>
          </div>
        </div>

        {/* 인건비 */}
        <ExpenseSection
          title="인건비"
          type="labor"
          items={expenses.filter(e => e.type === 'labor')}
          total={laborCost}
          onAdd={() => openAdd('labor')}
          onEdit={openEdit}
          onDelete={handleDelete}
        />

        {/* 기타잡비 */}
        <ExpenseSection
          title="기타잡비"
          type="misc"
          items={expenses.filter(e => e.type === 'misc')}
          total={miscCost}
          onAdd={() => openAdd('misc')}
          onEdit={openEdit}
          onDelete={handleDelete}
        />

        {/* 입력 모달 */}
        {show && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-3">
              <h3 className="font-semibold text-slate-800">
                {activeType === 'labor' ? '인건비' : '기타잡비'} {editId ? '수정' : '추가'}
              </h3>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">항목명 *</label>
                <input
                  type="text"
                  required
                  lang="ko"
                  autoComplete="off"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="예: 도배 인건비"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">금액</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    value={form.amount || ''}
                    onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 text-right"
                  />
                  <span className="text-sm text-slate-400 shrink-0">원</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">지출일</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">메모</label>
                <input
                  type="text"
                  lang="ko"
                  autoComplete="off"
                  value={form.memo}
                  onChange={e => setForm({ ...form, memo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm hover:bg-slate-800">저장</button>
                <button type="button" onClick={() => setShow(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">취소</button>
              </div>
            </form>
          </div>
        )}
      </div>
    )
  }

  function ExpenseSection({
    title, type, items, total, onAdd, onEdit, onDelete,
  }: {
    title: string
    type: ExpenseType
    items: SiteExpense[]
    total: number
    onAdd: () => void
    onEdit: (exp: SiteExpense) => void
    onDelete: (id: string) => void
  }) {
    const headerBg  = type === 'labor' ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
    const totalColor = type === 'labor' ? 'text-blue-600' : 'text-slate-700'
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-3 border-b ${headerBg}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{title}</span>
            <span className={`text-sm font-bold ${totalColor}`}>{total.toLocaleString()}원</span>
          </div>
          <button
            onClick={onAdd}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            + 추가
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">등록된 항목이 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map(exp => (
              <div key={exp.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700">{exp.description}</span>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium">{exp.amount.toLocaleString()}원</span>
                    {exp.date && <span className="text-xs text-slate-400">{exp.date}</span>}
                    {exp.memo && <span className="text-xs text-slate-400">{exp.memo}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onEdit(exp)} className="text-xs text-blue-600 hover:underline">수정</button>
                  <button onClick={() => onDelete(exp.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: TypeScript 확인**

  ```bash
  npx tsc --noEmit
  ```

  오류 없으면 통과.

- [ ] **Step 3: 커밋**

  ```bash
  git add app/sites/[id]/ExpenseTab.tsx
  git commit -m "feat: ExpenseTab 컴포넌트 추가 (손익요약, 인건비, 기타잡비)"
  ```

---

### Task 4: 현장 상세 페이지에 지출관리 탭 연결

**Files:**
- Modify: `app/sites/[id]/page.tsx`

- [ ] **Step 1: import 추가**

  파일 상단 import 블록에 추가:

  ```tsx
  import ExpenseTab from './ExpenseTab'
  ```

- [ ] **Step 2: Tab 타입 및 배열 수정**

  기존:
  ```tsx
  type Tab = '견적서' | '입금/정산' | '자재관리' | '도면' | 'AS관리' | '공정관리' | '고객페이지'
  const TABS: Tab[] = ['견적서', '입금/정산', '자재관리', '도면', 'AS관리', '공정관리', '고객페이지']
  const LOCKED_ON_PRE_CONTRACT: Tab[] = ['입금/정산', '자재관리', '도면', 'AS관리']
  ```

  변경:
  ```tsx
  type Tab = '견적서' | '입금/정산' | '자재관리' | '도면' | 'AS관리' | '공정관리' | '지출관리' | '고객페이지'
  const TABS: Tab[] = ['견적서', '입금/정산', '자재관리', '도면', 'AS관리', '공정관리', '지출관리', '고객페이지']
  const LOCKED_ON_PRE_CONTRACT: Tab[] = ['입금/정산', '자재관리', '도면', 'AS관리', '지출관리']
  ```

- [ ] **Step 3: 탭 렌더 블록에 ExpenseTab 추가**

  기존 `{tab === '고객페이지' && <ClientPageTab siteId={id} />}` 바로 위에 추가:

  ```tsx
  {tab === '지출관리' && <ExpenseTab siteId={id} />}
  ```

- [ ] **Step 4: 로컬에서 확인**

  ```bash
  npm run dev -- --port 3002
  ```

  브라우저에서 http://localhost:3002 접속 → 현장 상세 → "지출관리" 탭 클릭 → 손익 요약 카드, 자재비, 인건비, 기타잡비 섹션 노출 확인.
  계약전 현장에서는 탭에 자물쇠 아이콘 표시 확인.

- [ ] **Step 5: 커밋**

  ```bash
  git add app/sites/[id]/page.tsx
  git commit -m "feat: 현장 상세에 지출관리 탭 추가"
  ```

---

### Task 5: 대시보드 마진 현황 카드 추가

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: import에 Material, SiteExpense 추가**

  파일 상단:
  ```tsx
  import { Material, Quote, Settlement, SiteExpense, storage, Site } from '../lib/storage'
  ```

- [ ] **Step 2: state에 마진 데이터 필드 추가**

  기존 `data` state:
  ```tsx
  const [data, setData] = useState({
    sites: 0,
    customers: 0,
    activeSites: 0,
    totalPayment: 0,
    unpaid: 0,
    recentSites: [] as Site[],
  })
  ```

  변경:
  ```tsx
  const [data, setData] = useState({
    sites: 0,
    customers: 0,
    activeSites: 0,
    totalPayment: 0,
    unpaid: 0,
    recentSites: [] as Site[],
    totalCost: 0,
    expectedMargin: 0,
    realizedMargin: 0,
    marginRate: null as number | null,
  })
  ```

- [ ] **Step 3: useEffect의 Promise.all에 materials + siteExpenses 추가**

  기존:
  ```tsx
  Promise.all([
    storage.sites.list(),
    storage.quotes.list(),
  ]).then(async ([sites, quotes]) => {
  ```

  변경:
  ```tsx
  Promise.all([
    storage.sites.list(),
    storage.quotes.list(),
    storage.materials.list(),
    storage.siteExpenses.list(),
  ]).then(async ([sites, quotes, materials, siteExpenses]) => {
  ```

- [ ] **Step 4: 마진 계산 로직 추가**

  기존 `setData({...})` 바로 위에 추가:

  ```tsx
  let totalCost = 0
  sites.forEach(site => {
    const matCost   = materials.filter(m => m.siteId === site.id).reduce((s, m) => s + m.qty * m.unitPrice, 0)
    const laborCost = siteExpenses.filter(e => e.siteId === site.id && e.type === 'labor').reduce((s, e) => s + e.amount, 0)
    const miscCost  = siteExpenses.filter(e => e.siteId === site.id && e.type === 'misc').reduce((s, e) => s + e.amount, 0)
    totalCost += matCost + laborCost + miscCost
  })
  const expectedMargin = totalQuote - totalCost
  const realizedMargin = totalPayment - totalCost
  const marginRate     = totalQuote > 0 ? Math.round((expectedMargin / totalQuote) * 100) : null
  ```

  ※ `totalQuote`는 기존 코드에서 이미 계산된 변수 (각 사이트 contractTotal 합계).

- [ ] **Step 5: setData에 마진 필드 추가**

  기존 `setData({...})` 내부에 추가:

  ```tsx
  totalCost,
  expectedMargin,
  realizedMargin,
  marginRate,
  ```

- [ ] **Step 6: 마진 현황 카드 3개 렌더 추가**

  기존 미수금 카드(`<div className="bg-red-50 ...">`) 아래, 최근 현장 목록 위에 추가:

  ```tsx
  {/* 마진 현황 */}
  <div className="grid grid-cols-3 gap-3 mb-5">
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
      <p className="text-xs text-slate-400 mb-1.5">총 지출</p>
      <p className="text-2xl font-bold text-slate-800">{data.totalCost.toLocaleString()}원</p>
      <p className="text-xs text-slate-400 mt-1">자재비 + 인건비 + 기타잡비</p>
    </div>
    <div className={`border rounded-xl px-4 py-4 ${data.expectedMargin >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-slate-400 mb-1.5">예상 마진</p>
      <p className={`text-2xl font-bold ${data.expectedMargin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
        {data.expectedMargin.toLocaleString()}원
      </p>
      {data.marginRate !== null && (
        <p className="text-xs text-slate-400 mt-1">마진율 {data.marginRate}%</p>
      )}
    </div>
    <div className={`border rounded-xl px-4 py-4 ${data.realizedMargin >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-slate-400 mb-1.5">실현 마진</p>
      <p className={`text-2xl font-bold ${data.realizedMargin >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
        {data.realizedMargin.toLocaleString()}원
      </p>
      <p className="text-xs text-slate-400 mt-1">수금액 기준</p>
    </div>
  </div>
  ```

- [ ] **Step 7: 로컬에서 확인**

  브라우저에서 http://localhost:3002/dashboard 접속 → 마진 현황 카드 3개 확인.
  현장에 자재/지출 데이터가 없으면 모두 0원 표시가 정상.

- [ ] **Step 8: 커밋**

  ```bash
  git add app/dashboard/page.tsx
  git commit -m "feat: 대시보드에 총지출/예상마진/실현마진 카드 추가"
  ```

---

### Task 6: 배포

**Files:**
- 없음 (git push)

- [ ] **Step 1: push**

  ```bash
  git push origin main
  ```

- [ ] **Step 2: Vercel 배포 확인**

  https://daum-platform.vercel.app 접속 → 대시보드 마진 카드 + 현장 상세 지출관리 탭 동작 확인.

---

## 체크리스트

- [ ] Supabase `site_expenses` 테이블 생성
- [ ] storage.ts SiteExpense 타입 + CRUD
- [ ] ExpenseTab.tsx 생성 (손익요약, 자재비자동, 인건비, 기타잡비)
- [ ] 현장 상세 탭 배열 + 렌더 연결
- [ ] 대시보드 마진 카드 3개
- [ ] 배포 완료
