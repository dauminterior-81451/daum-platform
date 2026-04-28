'use client'

import { useEffect, useState } from 'react'
import { Material, Quote, Settlement, SiteExpense, newId, storage } from '../../lib/storage'

type ExpenseType = 'labor' | 'misc' | 'material'
type ExpenseForm = { description: string; amount: number; date: string; memo: string; category: string }

const defaultForm = (): ExpenseForm => ({
  description: '',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  memo: '',
  category: '',
})

function calcSettlementPaid(s: Settlement): number {
  return (['deposit', 'startup', 'interim', 'balance'] as const)
    .filter(k => s[k].paid)
    .reduce((sum, k) => sum + (s[k].amount || 0), 0)
}

// contractTotal이 0일 경우 최신 견적서 합계를 대체값으로 사용
function calcQuoteTotal(quotes: Quote[]): number {
  if (quotes.length === 0) return 0
  const last = quotes.reduce((a, b) => (b.revision ?? 1) >= (a.revision ?? 1) ? b : a)
  const supply = last.items
    .filter(i => i.unit !== '__group__')
    .reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const tm = last.taxMode ?? 'exc'
  return tm === 'exc' ? Math.round(supply * 1.1) : supply
}

function marginColor(val: number): string {
  return val >= 0 ? 'text-green-700' : 'text-red-600'
}

export default function ExpenseTab({ siteId }: { siteId: string }) {
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [quotes, setQuotes]         = useState<Quote[]>([])
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
      storage.quotes.list(),
    ]).then(([s, mats, exps, qs]) => {
      setSettlement(s)
      setMaterials(mats.filter(m => m.siteId === siteId))
      setExpenses(exps)
      setQuotes(qs.filter(q => q.siteId === siteId))
    })
  }, [siteId])

  const materialCost        = materials.reduce((s, m) => s + m.qty * m.unitPrice, 0)
  const orderedMaterialCost = expenses.filter(e => e.type === 'material').reduce((s, e) => s + e.amount, 0)
  const laborCost           = expenses.filter(e => e.type === 'labor').reduce((s, e) => s + e.amount, 0)
  const miscCost            = expenses.filter(e => e.type === 'misc').reduce((s, e) => s + e.amount, 0)
  const totalCost           = materialCost + orderedMaterialCost + laborCost + miscCost

  const contractTotal  = settlement?.contractTotal || calcQuoteTotal(quotes)
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
    setForm({ description: exp.description, amount: exp.amount, date: exp.date, memo: exp.memo, category: exp.category ?? '' })
    setShow(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) return
    if (editId) {
      const base = expenses.find(x => x.id === editId)
      if (!base) return
      const updated: SiteExpense = { ...base, ...form, type: activeType }
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

  const modalTitle = activeType === 'labor' ? '인건비' : activeType === 'misc' ? '기타잡비' : '발주자재'
  const modalPlaceholder = activeType === 'material' ? '예: 포세린타일 300×600' : activeType === 'labor' ? '예: 도배 인건비' : '예: 청소비'

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

      {/* 자재비 — 자재관리 탭 자동 집계 (읽기 전용) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-orange-50 border-orange-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">자재비</span>
            <span className="text-sm font-bold text-orange-600">{materialCost.toLocaleString()}원</span>
          </div>
          <span className="text-xs text-slate-400">자재관리 탭에서 수정</span>
        </div>
        {materials.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">등록된 자재가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[380px]">
              <thead className="bg-slate-50 text-slate-400">
                <tr>
                  {['품목 | 자재명', '수량', '단가', '금액'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map(m => (
                  <tr key={m.id} className="text-slate-600">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {m.category
                        ? <><span className="text-slate-400 font-normal">{m.category}</span> | {m.name}</>
                        : m.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{m.qty}{m.unit}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{m.unitPrice.toLocaleString()}원</td>
                    <td className="px-3 py-2 font-medium text-orange-600 whitespace-nowrap">{(m.qty * m.unitPrice).toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 발주자재 */}
      <ExpenseSection
        title="발주자재"
        items={expenses.filter(e => e.type === 'material')}
        total={orderedMaterialCost}
        headerBg="bg-amber-50 border-amber-100"
        totalColor="text-amber-600"
        onAdd={() => openAdd('material')}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* 인건비 */}
      <ExpenseSection
        title="인건비"
        items={expenses.filter(e => e.type === 'labor')}
        total={laborCost}
        headerBg="bg-blue-50 border-blue-100"
        totalColor="text-blue-600"
        onAdd={() => openAdd('labor')}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* 기타잡비 */}
      <ExpenseSection
        title="기타잡비"
        items={expenses.filter(e => e.type === 'misc')}
        total={miscCost}
        headerBg="bg-slate-50 border-slate-100"
        totalColor="text-slate-700"
        onAdd={() => openAdd('misc')}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* 입력 모달 */}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShow(false)}>
          <form onSubmit={handleSave} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-slate-800">{modalTitle} {editId ? '수정' : '추가'}</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">품목</label>
              <input
                type="text"
                lang="ko"
                autoComplete="off"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                placeholder="예: 욕실, 거실, 주방"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">항목명 *</label>
              <input
                type="text"
                required
                lang="ko"
                autoComplete="off"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={modalPlaceholder}
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
  title, items, total, headerBg, totalColor, onAdd, onEdit, onDelete,
}: {
  title: string
  items: SiteExpense[]
  total: number
  headerBg: string
  totalColor: string
  onAdd: () => void
  onEdit: (exp: SiteExpense) => void
  onDelete: (id: string) => void
}) {
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
                <span className="text-sm font-medium text-slate-700">
                  {exp.category
                    ? <><span className="text-slate-400 font-normal">{exp.category}</span> | {exp.description}</>
                    : exp.description}
                </span>
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
