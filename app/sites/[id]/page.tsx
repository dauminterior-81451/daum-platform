'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  AsItem,
  Material,
  newId,
  Quote,
  QuoteItem,
  Settlement,
  Site,
  SITE_STATUS_LABELS,
  SiteStatus,
  StagePayment,
  storage,
} from '../../lib/storage'

type Tab = '견적서' | '입금/정산' | '자재관리' | 'AS관리'
const TABS: Tab[] = ['견적서', '입금/정산', '자재관리', 'AS관리']
const LOCKED_ON_PRE_CONTRACT: Tab[] = ['입금/정산', '자재관리', 'AS관리']

const STATUS_BADGE: Record<SiteStatus, string> = {
  pre_contract: 'bg-slate-100 text-slate-600',
  in_progress:  'bg-blue-100 text-blue-700',
  completed:    'bg-green-100 text-green-700',
}

type EditForm = {
  name: string
  customerName: string
  customerPhone: string
  customerEmail: string
  address: string
  startDate: string
  memo: string
}

function siteToForm(s: Site): EditForm {
  return {
    name:          s.name,
    customerName:  s.customerName  ?? '',
    customerPhone: s.customerPhone ?? '',
    customerEmail: s.customerEmail ?? '',
    address:       s.address,
    startDate:     s.startDate,
    memo:          s.memo,
  }
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab]       = useState<Tab>('견적서')
  const [site, setSite]     = useState<Site | null | undefined>(undefined)
  const [editing, setEditing]   = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(false)

  useEffect(() => {
    storage.sites.list().then(sites => setSite(sites.find(s => s.id === id) ?? null))
  }, [id])

  async function handleStatusChange(next: SiteStatus) {
    if (!site) return
    if (!confirm(`상태를 "${SITE_STATUS_LABELS[next]}"(으)로 변경하시겠습니까?`)) return
    const updated: Site = { ...site, status: next }
    await storage.sites.upsert(updated)
    setSite(updated)
  }

  function startEdit() {
    if (!site) return
    setEditForm(siteToForm(site))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditForm(null)
  }

  async function handleSave() {
    if (!site || !editForm) return
    setSaving(true)
    const updated: Site = { ...site, ...editForm }
    await storage.sites.upsert(updated)
    setSite(updated)
    setEditing(false)
    setEditForm(null)
    setSaving(false)
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  if (site === undefined) return <div className="p-6 text-sm text-gray-400">로딩 중...</div>

  if (!site) {
    return (
      <div className="p-6">
        <p className="text-gray-500">현장을 찾을 수 없습니다.</p>
        <Link href="/sites" className="text-blue-600 hover:underline text-sm mt-2 inline-block">← 목록으로</Link>
      </div>
    )
  }

  const isLocked = (t: Tab) =>
    site.status === 'pre_contract' && LOCKED_ON_PRE_CONTRACT.includes(t)

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400'

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-4">
        <Link href="/sites" className="text-sm text-gray-400 hover:text-gray-600">← 현장목록</Link>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-xl font-bold text-gray-800">{site.name}</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[site.status]}`}>
            {SITE_STATUS_LABELS[site.status]}
          </span>
          {site.status === 'pre_contract' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              진행중으로 변경
            </button>
          )}
          {site.status === 'in_progress' && (
            <button
              onClick={() => handleStatusChange('completed')}
              className="text-xs px-3 py-1 rounded-lg border border-green-500 text-green-600 hover:bg-green-50 transition"
            >
              완료로 변경
            </button>
          )}
        </div>
      </div>

      {/* 기본정보 카드 */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-5 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">기본정보</span>
          {!editing && (
            <button
              onClick={startEdit}
              className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-white transition"
            >
              수정
            </button>
          )}
        </div>

        {editing && editForm ? (
          <div className="px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">현장명</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">고객명</label>
                <input value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">연락처</label>
                <input value={editForm.customerPhone} onChange={e => setEditForm({ ...editForm, customerPhone: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">이메일</label>
                <input type="email" value={editForm.customerEmail} onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">주소</label>
                <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">계약일</label>
                <input type="date" value={editForm.startDate} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">메모</label>
              <input value={editForm.memo} onChange={e => setEditForm({ ...editForm, memo: e.target.value })} className={inputCls} placeholder="특이사항 등" />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm hover:bg-slate-800 transition disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={cancelEdit}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-4 py-4 text-sm">
            {[
              { label: '현장명', value: site.name },
              { label: '고객명', value: site.customerName  || '—' },
              { label: '연락처', value: site.customerPhone || '—' },
              { label: '이메일', value: site.customerEmail || '—' },
              { label: '주소',   value: site.address       || '—' },
              { label: '계약일', value: site.startDate     || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="text-slate-400 w-14 shrink-0">{label}</span>
                <span className="text-slate-700 font-medium">{value}</span>
              </div>
            ))}
            {site.memo && (
              <div className="col-span-2 flex gap-3">
                <span className="text-slate-400 w-14 shrink-0">메모</span>
                <span className="text-slate-700">{site.memo}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => {
          const locked = isLocked(t)
          return (
            <button
              key={t}
              onClick={() => { if (!locked) setTab(t) }}
              disabled={locked}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                locked
                  ? 'border-transparent text-gray-300 cursor-not-allowed'
                  : tab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {locked && <span className="text-[10px] leading-none">🔒</span>}
            </button>
          )
        })}
      </div>

      {tab === '견적서' && <QuoteTab siteId={id} />}
      {tab === '입금/정산' && <PaymentTab siteId={id} />}
      {tab === '자재관리' && <MaterialTab siteId={id} />}
      {tab === 'AS관리' && <AsTab siteId={id} />}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          저장되었습니다
        </div>
      )}
    </div>
  )
}

// ─── 견적서 ───────────────────────────────────────────────────────────────────
type LocalItem  = { id: string; name: string; desc: string; qty: number; unit: string; unitPrice: number }
type LocalGroup = { id: string; name: string; items: LocalItem[] }

const GROUP_COLORS = [
  { border: 'border-blue-200',   bg: 'bg-blue-50',   num: 'bg-blue-100 text-blue-600',    sub: 'text-blue-500'   },
  { border: 'border-green-200',  bg: 'bg-green-50',  num: 'bg-green-100 text-green-600',  sub: 'text-green-500'  },
  { border: 'border-orange-200', bg: 'bg-orange-50', num: 'bg-orange-100 text-orange-600',sub: 'text-orange-500' },
  { border: 'border-slate-200',  bg: 'bg-slate-50',  num: 'bg-slate-100 text-slate-600',  sub: 'text-slate-400'  },
]

function uid() { return Math.random().toString(36).slice(2) }
function makeItem(): LocalItem  { return { id: uid(), name: '', desc: '', qty: 1, unit: '식', unitPrice: 0 } }
function makeGroup(name = ''): LocalGroup { return { id: uid(), name, items: [makeItem()] } }

function flattenGroups(groups: LocalGroup[]): QuoteItem[] {
  const out: QuoteItem[] = []
  for (const g of groups) {
    out.push({ name: g.name, qty: 0, unit: '__group__', unitPrice: 0 })
    for (const i of g.items) {
      if (i.name.trim()) out.push({ name: i.name, desc: i.desc, qty: i.qty, unit: i.unit, unitPrice: i.unitPrice })
    }
  }
  return out
}

function parseGroups(items: QuoteItem[]): LocalGroup[] {
  const groups: LocalGroup[] = []
  let cur: LocalGroup | null = null
  for (const item of items) {
    if (item.unit === '__group__') {
      cur = { id: uid(), name: item.name, items: [] }
      groups.push(cur)
    } else if (cur) {
      cur.items.push({ id: uid(), name: item.name, desc: item.desc ?? '', qty: item.qty, unit: item.unit, unitPrice: item.unitPrice })
    }
  }
  for (const g of groups) if (g.items.length === 0) g.items = [makeItem()]
  return groups.length > 0 ? groups : [makeGroup()]
}

type DiffResult = { added: string[]; changed: string[]; deleted: string[] }
function computeQuoteDiff(prev: Quote, curr: Quote): DiffResult {
  const toMap = (grps: LocalGroup[]) => new Map(
    grps.flatMap(g => g.items.filter(i => i.name.trim())
      .map(i => [`${g.name}§${i.name}`, i.qty * i.unitPrice] as [string, number]))
  )
  const pm = toMap(parseGroups(prev.items))
  const cm = toMap(parseGroups(curr.items))
  const added: string[] = [], changed: string[] = [], deleted: string[] = []
  cm.forEach((amt, key) => {
    if (!pm.has(key)) added.push(key.split('§')[1])
    else if (pm.get(key) !== amt) changed.push(key.split('§')[1])
  })
  pm.forEach((_, key) => { if (!cm.has(key)) deleted.push(key.split('§')[1]) })
  return { added, changed, deleted }
}

function groupSubtotal(g: LocalGroup) {
  return g.items.reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0)
}

function QuoteTab({ siteId }: { siteId: string }) {
  const [quotes, setQuotes]   = useState<Quote[]>([])
  const [show, setShow]       = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [date, setDate]       = useState('')
  const [note, setNote]       = useState('')
  const [groups, setGroups]       = useState<LocalGroup[]>([makeGroup()])
  const [taxMode, setTaxMode]     = useState<'exc' | 'inc' | 'none'>('exc')
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const isComposing = useRef(false)

  function focusNext(el: HTMLElement) {
    const form = el.closest('form')
    if (!form) return
    const all = Array.from(form.querySelectorAll<HTMLElement>('input, textarea'))
    const idx = all.indexOf(el)
    if (idx !== -1 && idx < all.length - 1) all[idx + 1].focus()
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!isComposing.current) focusNext(e.currentTarget)
  }

  useEffect(() => {
    storage.quotes.list().then(all => setQuotes(all.filter(q => q.siteId === siteId)))
  }, [siteId])

  function openNew() {
    setEditId(null)
    setDate(new Date().toISOString().slice(0, 10))
    setNote('')
    setGroups([{ id: uid(), name: '', items: [makeItem()] }])
    setTaxMode('exc')
    setShow(true)
  }
  function openEdit(q: Quote) {
    setEditId(q.id); setDate(q.date); setNote(q.note)
    setTaxMode(q.taxMode ?? 'exc')
    setGroups(parseGroups(q.items)); setShow(true)
  }
  function openCopy(q: Quote) {
    setEditId(null)
    setDate(new Date().toISOString().slice(0, 10))
    setNote(q.note)
    setTaxMode(q.taxMode ?? 'exc')
    setGroups(parseGroups(q.items))
    setShow(true)
  }

  async function handleSave() {
    const flat = flattenGroups(groups)
    if (!flat.some(i => i.unit !== '__group__')) return
    const today = new Date().toISOString().slice(0, 10)
    if (editId) {
      const updated: Quote = { ...quotes.find(q => q.id === editId)!, date, note, taxMode, items: flat, updatedAt: today }
      await storage.quotes.upsert(updated)
      setQuotes(prev => prev.map(q => q.id === editId ? updated : q))
    } else {
      const nextRev = Math.max(0, ...quotes.map(q => q.revision ?? 0)) + 1
      const newQ: Quote = { id: newId(), siteId, date, note, taxMode, items: flat, revision: nextRev, createdAt: today, updatedAt: today }
      await storage.quotes.upsert(newQ)
      setQuotes(prev => [...prev, newQ])
    }
    setShow(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제?')) return
    await storage.quotes.remove(id)
    setQuotes(prev => prev.filter(q => q.id !== id))
  }

  // 그룹 조작
  function addGroup(name = '') { setGroups(g => [...g, makeGroup(name)]) }
  function removeGroup(gid: string) { setGroups(g => g.filter(x => x.id !== gid)) }
  function moveGroup(gid: string, dir: -1 | 1) {
    setGroups(g => {
      const idx = g.findIndex(x => x.id === gid)
      const next = idx + dir
      if (next < 0 || next >= g.length) return g
      const arr = [...g];
      [arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }
  function updateGroupName(gid: string, name: string) {
    setGroups(g => g.map(x => x.id === gid ? { ...x, name } : x))
  }
  function addItem(gid: string) {
    setGroups(g => g.map(x => x.id === gid ? { ...x, items: [...x.items, makeItem()] } : x))
  }
  function removeItem(gid: string, iid: string) {
    setGroups(g => g.map(x => x.id === gid ? { ...x, items: x.items.filter(i => i.id !== iid) } : x))
  }
  function updateItem(gid: string, iid: string, field: keyof LocalItem, value: string | number) {
    setGroups(g => g.map(x => x.id === gid
      ? { ...x, items: x.items.map(i => i.id === iid ? { ...i, [field]: value } : i) }
      : x))
  }

  // 합계
  const supply = groups.flatMap(g => g.items).reduce((s, i) => s + (i.qty || 0) * (i.unitPrice || 0), 0)
  const tax    = taxMode === 'exc' ? Math.round(supply * 0.1)
               : taxMode === 'inc' ? supply - Math.round(supply / 1.1) : 0
  const total  = taxMode === 'exc' ? supply + tax : supply

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={openNew} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800">
          + 견적서 추가
        </button>
      </div>

      {/* ── 모달 ── */}
      {show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={(e) => e.preventDefault()} className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-semibold text-slate-800">견적서 {editId ? '수정' : '작성'}</h3>
              <button type="button" onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* 스크롤 영역 */}
            <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
              {/* 날짜 + 부가세 */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-xs text-slate-500 mb-1 block">견적일자</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    onKeyDown={onEnter}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">부가세</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    {([['exc','별도(10%)'],['inc','포함'],['none','없음']] as const).map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setTaxMode(v)}
                        className={`px-3 py-2 text-xs font-medium border-r border-slate-200 last:border-0 transition ${taxMode === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 품목 목록 */}
              <div className="space-y-3">
                {groups.map((g, gIdx) => {
                  const c = GROUP_COLORS[Math.min(gIdx, 3)]
                  return (
                    <div key={g.id} className={`border rounded-xl overflow-hidden ${c.border}`}>
                      {/* 품목 헤더 */}
                      <div className={`flex items-center gap-2 px-3 py-2 border-b ${c.bg} ${c.border}`}>
                        <input value={g.name} onChange={(e) => updateGroupName(g.id, e.target.value)}
                          placeholder={`품목 ${gIdx + 1}`}
                          autoComplete="off"
                          onCompositionStart={() => { isComposing.current = true }}
                          onCompositionEnd={() => { isComposing.current = false }}
                          onKeyDown={onEnter}
                          className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder-slate-400" />
                        <span className={`text-xs whitespace-nowrap shrink-0 font-medium ${c.sub}`}>
                          {groupSubtotal(g).toLocaleString()}원
                        </span>
                        <button type="button" onClick={() => removeGroup(g.id)}
                          className="text-red-400 hover:text-red-600 text-sm shrink-0">✕</button>
                      </div>
                      {/* 컬럼 헤더 */}
                      <div className="grid grid-cols-12 gap-1 px-3 pt-2 pb-0.5 text-xs text-slate-400">
                        <span className="col-span-3">항목명</span>
                        <span className="col-span-4">내용</span>
                        <span className="col-span-2 text-right">단가</span>
                        <span className="col-span-1 text-center">수량</span>
                        <span className="col-span-1 text-center">단위</span>
                        <span className="col-span-1" />
                      </div>
                      {/* 항목 */}
                      <div className="px-3 pb-2 space-y-0.5">
                        {g.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-1 items-start py-1 border-b border-slate-50 last:border-0">
                            <input value={item.name} onChange={(e) => updateItem(g.id, item.id, 'name', e.target.value)}
                              placeholder="항목명"
                              autoComplete="off"
                              onCompositionStart={() => { isComposing.current = true }}
                              onCompositionEnd={() => { isComposing.current = false }}
                              onKeyDown={onEnter}
                              className="col-span-3 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-400" />
                            <div className="col-span-4">
                              {editingDescId === item.id ? (
                                <textarea autoFocus value={item.desc}
                                  onChange={(e) => {
                                    e.target.style.height = 'auto'
                                    e.target.style.height = e.target.scrollHeight + 'px'
                                    updateItem(g.id, item.id, 'desc', e.target.value)
                                  }}
                                  onBlur={() => setEditingDescId(null)}
                                  className="w-full border border-slate-400 rounded px-2 py-1.5 text-xs focus:outline-none resize-none overflow-hidden"
                                  style={{ minHeight: '32px' }}
                                />
                              ) : (
                                <div onClick={() => setEditingDescId(item.id)}
                                  className="group/desc flex items-start gap-1 min-h-[32px] px-2 py-1.5 rounded border border-transparent hover:border-slate-200 cursor-pointer">
                                  <span className="flex-1 text-xs text-slate-600 whitespace-pre-wrap break-all">
                                    {item.desc ? item.desc : <span className="text-slate-300">내용</span>}
                                  </span>
                                  <span className="opacity-0 group-hover/desc:opacity-100 text-slate-400 text-xs shrink-0 mt-0.5">✎</span>
                                </div>
                              )}
                            </div>
                            <input type="text" inputMode="numeric"
                              value={item.unitPrice || ''}
                              placeholder="0"
                              onChange={(e) => updateItem(g.id, item.id, 'unitPrice', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                              onKeyDown={onEnter}
                              className="col-span-2 border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:border-slate-400" />
                            <input type="text" inputMode="numeric"
                              value={item.qty || ''}
                              placeholder="0"
                              onChange={(e) => updateItem(g.id, item.id, 'qty', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                              onKeyDown={onEnter}
                              className="col-span-1 border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-slate-400" />
                            <input value={item.unit} onChange={(e) => updateItem(g.id, item.id, 'unit', e.target.value)}
                              autoComplete="off"
                              onCompositionStart={() => { isComposing.current = true }}
                              onCompositionEnd={() => { isComposing.current = false }}
                              onKeyDown={onEnter}
                              className="col-span-1 border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-slate-400" />
                            <button type="button" onClick={() => removeItem(g.id, item.id)}
                              className="col-span-1 text-red-400 hover:text-red-600 text-xs text-center pt-1.5">✕</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addItem(g.id)}
                          className="text-xs text-slate-500 hover:text-slate-800 mt-1.5 pl-1">+ 항목 추가</button>
                      </div>
                    </div>
                  )
                })}
                <button type="button" onClick={() => addGroup()}
                  className="w-full border border-dashed border-slate-300 text-slate-400 hover:border-slate-500 hover:text-slate-600 text-xs py-2 rounded-xl transition">
                  + 품목 추가
                </button>
              </div>

              {/* 비고 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">비고</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="특이사항, 시공조건 등"
                  autoComplete="off"
                  onCompositionStart={() => { isComposing.current = true }}
                  onCompositionEnd={() => { isComposing.current = false }}
                  onKeyDown={onEnter}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400" />
              </div>
            </div>

            {/* 합계 요약 — 하단 고정 */}
            <div className="border-t border-slate-200 shrink-0">
              <div className="flex divide-x divide-slate-200 text-sm">
                <div className="flex-1 flex justify-between px-4 py-2.5 bg-slate-50 text-slate-600">
                  <span>공급가액</span>
                  <span className="font-medium">{supply.toLocaleString()}원</span>
                </div>
                {taxMode !== 'none' && (
                  <div className="flex-1 flex justify-between px-4 py-2.5 bg-violet-50 text-violet-600">
                    <span>부가세</span>
                    <span className="font-medium">{tax.toLocaleString()}원</span>
                  </div>
                )}
                <div className="flex-1 flex justify-between px-4 py-2.5 bg-slate-900 text-white font-semibold">
                  <span>총 합계</span>
                  <span>{total.toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* 저장/취소 */}
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
              <button type="button" onClick={handleSave} className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm hover:bg-slate-800">저장</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">취소</button>
            </div>
          </form>
        </div>
      )}

      {/* ── 견적서 목록 ── */}
      <div className="space-y-2">
        {quotes.length === 0 && <Empty text="등록된 견적서가 없습니다." />}
        {[...quotes].sort((a, b) => (a.revision ?? 0) - (b.revision ?? 0)).map((q) => {
          const rev        = q.revision ?? 1
          const groupCount = q.items.filter(i => i.unit === '__group__').length
          const supply     = q.items.filter(i => i.unit !== '__group__').reduce((s, i) => s + i.qty * i.unitPrice, 0)
          const tm         = q.taxMode ?? 'exc'
          const taxAmt     = tm === 'exc' ? Math.round(supply * 0.1) : tm === 'inc' ? supply - Math.round(supply / 1.1) : 0
          const qTotal     = tm === 'exc' ? supply + taxAmt : supply
          const TAX_LABEL  = { exc: '부가세 별도', inc: '부가세 포함', none: '부가세 없음' } as const
          const TAX_COLOR  = { exc: 'bg-violet-50 text-violet-600', inc: 'bg-blue-50 text-blue-600', none: 'bg-slate-100 text-slate-500' } as const
          const prevQ      = quotes.find(x => (x.revision ?? 0) === rev - 1)
          const diff       = prevQ ? computeQuoteDiff(prevQ, q) : null
          const totalDiff  = diff ? diff.added.length + diff.changed.length + diff.deleted.length : 0
          return (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {rev === 1
                    ? <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">최초</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-600">수정</span>
                  }
                  <span className="text-sm font-semibold text-slate-700">{rev}차 견적</span>
                  <span className="text-xs text-slate-400">
                    작성일: {q.createdAt ?? q.date}
                    {q.updatedAt && q.updatedAt !== q.createdAt && ` / 수정일: ${q.updatedAt}`}
                  </span>
                  <span className="text-xs text-slate-400">품목 {groupCount}개</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAX_COLOR[tm]}`}>{TAX_LABEL[tm]}</span>
                  {totalDiff > 0 && (
                    <span className="text-xs text-slate-400">{totalDiff}개 항목 변경됨</span>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-800 shrink-0">{qTotal.toLocaleString()}원</span>
              </div>
              {/* 변경 항목 배지 */}
              {diff && totalDiff > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {diff.added.map(name => (
                    <span key={`a-${name}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <span className="font-bold">추가</span>{name}
                    </span>
                  ))}
                  {diff.changed.map(name => (
                    <span key={`c-${name}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                      <span className="font-bold">변경</span>{name}
                    </span>
                  ))}
                  {diff.deleted.map(name => (
                    <span key={`d-${name}`} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-500">
                      <span className="font-bold">삭제</span><span className="line-through">{name}</span>
                    </span>
                  ))}
                </div>
              )}
              {/* 푸터 */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50">
                {q.note
                  ? <span className="text-xs text-slate-400 truncate mr-3">비고: {q.note}</span>
                  : <span />
                }
                <div className="flex gap-1.5 shrink-0">
                  <Link href={`/sites/${siteId}/quotes/${q.id}/preview`}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition">미리보기</Link>
                  <button onClick={() => openCopy(q)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-white transition">새 차수로 저장</button>
                  <button onClick={() => openEdit(q)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition">수정</button>
                  <button onClick={() => handleDelete(q.id)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition">삭제</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 입금/정산 ────────────────────────────────────────────────────────────────
type StageKey = 'deposit' | 'startup' | 'interim' | 'balance'
const STAGE_LABELS: Record<StageKey, string> = {
  deposit: '계약금',
  startup: '착수금',
  interim: '중도금',
  balance: '잔금',
}
const DEFAULT_RATIOS: Record<StageKey, number> = {
  deposit: 0.1,
  startup: 0.4,
  interim: 0.4,
  balance: 0.1,
}

function defaultStage(ratio = 0): StagePayment {
  return { amount: 0, ratio, scheduledDate: '', paidDate: '', paid: false }
}
function defaultSettlement(siteId: string): Settlement {
  return {
    siteId,
    contractTotal: 0,
    deposit: defaultStage(DEFAULT_RATIOS.deposit),
    startup: defaultStage(DEFAULT_RATIOS.startup),
    interim: defaultStage(DEFAULT_RATIOS.interim),
    balance: defaultStage(DEFAULT_RATIOS.balance),
  }
}

function applyAutoCalc(data: Settlement): Settlement {
  const total = data.contractTotal || 0
  const keys: StageKey[] = ['deposit', 'startup', 'interim', 'balance']
  const updated = { ...data }
  keys.forEach(k => {
    updated[k] = { ...data[k], amount: Math.round(total * DEFAULT_RATIOS[k]) }
  })
  return updated
}

function PaymentTab({ siteId }: { siteId: string }) {
  const [data, setData] = useState<Settlement>(() => defaultSettlement(siteId))

  useEffect(() => {
    storage.settlements.get(siteId).then(saved => {
      if (saved) {
        // startup 컬럼이 없는 기존 데이터 대응
        setData({
          ...defaultSettlement(siteId),
          ...saved,
          startup: saved.startup ?? defaultStage(DEFAULT_RATIOS.startup),
        })
      } else {
        setData(defaultSettlement(siteId))
      }
    })
  }, [siteId])

  function persist(next: Settlement) {
    setData(next)
    storage.settlements.save(siteId, next).catch(console.error)
  }

  function handleContractTotalChange(val: number) {
    const next = applyAutoCalc({ ...data, contractTotal: val })
    persist(next)
  }

  function handleAutoCalc() {
    persist(applyAutoCalc(data))
  }

  function updateStage(key: StageKey, field: keyof StagePayment, value: string | number | boolean) {
    persist({ ...data, [key]: { ...data[key], [field]: value } })
  }

  function handleRatioChange(key: StageKey, raw: string) {
    const sanitized = raw.replace(/[^0-9]/g, '')
    const pct       = Math.min(100, Math.max(0, Number(sanitized) || 0))
    const ratio     = pct / 100
    const amount    = Math.round((data.contractTotal || 0) * ratio)
    persist({ ...data, [key]: { ...data[key], ratio, amount } })
  }

  const STAGES: StageKey[] = ['deposit', 'startup', 'interim', 'balance']
  const totalPaid  = STAGES.filter(k => data[k].paid).reduce((s, k) => s + (data[k].amount || 0), 0)
  const outstanding = (data.contractTotal || 0) - totalPaid

  return (
    <div className="space-y-4">
      {/* 계약 총액 + 자동계산 버튼 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <label className="text-xs text-slate-500 mb-1.5 block font-medium">계약 총액</label>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0}
            value={data.contractTotal || ''}
            onChange={(e) => handleContractTotalChange(Number(e.target.value))}
            placeholder="0"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 text-right"
          />
          <span className="text-sm text-slate-400 shrink-0">원</span>
          <button
            type="button"
            onClick={handleAutoCalc}
            className="shrink-0 text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition whitespace-nowrap"
          >
            자동계산
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">계약금 10% · 착수금 40% · 중도금 40% · 잔금 10%</p>
      </div>

      {/* 수금 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">계약총액</p>
          <p className="text-sm font-bold text-slate-700">{(data.contractTotal || 0).toLocaleString()}원</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xs text-green-500 mb-1">수금액</p>
          <p className="text-sm font-bold text-green-700">{totalPaid.toLocaleString()}원</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${outstanding > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
          <p className={`text-xs mb-1 ${outstanding > 0 ? 'text-red-400' : 'text-slate-400'}`}>미수금</p>
          <p className={`text-sm font-bold ${outstanding > 0 ? 'text-red-600' : 'text-slate-500'}`}>{outstanding.toLocaleString()}원</p>
        </div>
      </div>

      {/* 4단계 수금 */}
      {STAGES.map((key) => {
        const s = data[key]
        return (
          <div key={key} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${s.paid ? 'border-green-200' : 'border-slate-200'}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${s.paid ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-700">{STAGE_LABELS[key]}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={Math.round((s.ratio ?? DEFAULT_RATIOS[key]) * 100)}
                  onChange={(e) => handleRatioChange(key, e.target.value)}
                  className="w-10 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:border-slate-400"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-slate-500">입금완료</span>
                <input
                  type="checkbox" checked={s.paid}
                  onChange={(e) => updateStage(key, 'paid', e.target.checked)}
                  className="w-4 h-4 accent-green-600 cursor-pointer"
                />
              </label>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">금액</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0}
                    value={s.amount || ''}
                    onChange={(e) => updateStage(key, 'amount', Number(e.target.value))}
                    placeholder="0"
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-slate-400 text-right min-w-0"
                  />
                  <span className="text-xs text-slate-400 shrink-0">원</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">예정일</label>
                <input
                  type="date" value={s.scheduledDate}
                  onChange={(e) => updateStage(key, 'scheduledDate', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-slate-400"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">입금일</label>
                <input
                  type="date" value={s.paidDate}
                  onChange={(e) => updateStage(key, 'paidDate', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 자재관리 ─────────────────────────────────────────────────────────────────
type MatForm = { name: string; spec: string; qty: number; unit: string; unitPrice: number; supplier: string; purchaseDate: string; note: string }
const defaultMatForm = (): MatForm => ({ name: '', spec: '', qty: 1, unit: '개', unitPrice: 0, supplier: '', purchaseDate: new Date().toISOString().slice(0, 10), note: '' })

function MaterialTab({ siteId }: { siteId: string }) {
  const [list, setList] = useState<Material[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<MatForm>(defaultMatForm())

  useEffect(() => {
    storage.materials.list().then(all => setList(all.filter(m => m.siteId === siteId)))
  }, [siteId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      const updated: Material = { ...list.find(m => m.id === editId)!, ...form }
      await storage.materials.upsert(updated)
      setList(prev => prev.map(m => m.id === editId ? updated : m))
    } else {
      const newMat: Material = { id: newId(), siteId, ...form }
      await storage.materials.upsert(newMat)
      setList(prev => [...prev, newMat])
    }
    setShow(false)
  }

  function openEdit(m: Material) {
    setEditId(m.id)
    setForm({ name: m.name, spec: m.spec ?? '', qty: m.qty, unit: m.unit, unitPrice: m.unitPrice, supplier: m.supplier ?? '', purchaseDate: m.purchaseDate, note: m.note })
    setShow(true)
  }

  const totalCost = list.reduce((s, m) => s + m.qty * m.unitPrice, 0)

  const FIELDS: { f: keyof MatForm; label: string; type: string; required?: boolean }[] = [
    { f: 'name',         label: '자재명',   type: 'text',   required: true },
    { f: 'spec',         label: '규격',     type: 'text' },
    { f: 'qty',          label: '수량',     type: 'number' },
    { f: 'unitPrice',    label: '단가',     type: 'number' },
    { f: 'supplier',     label: '공급업체', type: 'text' },
    { f: 'purchaseDate', label: '입고예정일', type: 'date' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-slate-600">
          총 자재비: <strong className="text-orange-600">{totalCost.toLocaleString()}원</strong>
        </span>
        <button
          onClick={() => { setEditId(null); setForm(defaultMatForm()); setShow(true) }}
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800"
        >
          + 자재 추가
        </button>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-slate-800">자재 {editId ? '수정' : '추가'}</h3>
            {FIELDS.map(({ f, label, type, required }) => (
              <div key={f}>
                <label className="text-xs text-slate-500 mb-1 block">{label}{required && ' *'}</label>
                <input
                  type={type}
                  value={(form as Record<string, string | number>)[f]}
                  required={required}
                  min={type === 'number' ? 0 : undefined}
                  onChange={(e) => setForm({ ...form, [f]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm hover:bg-slate-800">저장</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">취소</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 ? <Empty text="등록된 자재가 없습니다." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-slate-400 text-xs">
                <tr>
                  {['자재명', '규격', '수량', '단가', '금액', '공급업체', '입고예정일', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                    <td className="px-4 py-3 text-slate-500">{m.spec}</td>
                    <td className="px-4 py-3">{m.qty}{m.unit}</td>
                    <td className="px-4 py-3">{m.unitPrice.toLocaleString()}원</td>
                    <td className="px-4 py-3 font-medium text-orange-600">{(m.qty * m.unitPrice).toLocaleString()}원</td>
                    <td className="px-4 py-3 text-slate-500">{m.supplier}</td>
                    <td className="px-4 py-3 text-slate-500">{m.purchaseDate}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:underline">수정</button>
                      <button onClick={async () => { if (!confirm('삭제?')) return; await storage.materials.remove(m.id); setList(prev => prev.filter(x => x.id !== m.id)) }} className="text-xs text-red-500 hover:underline">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AS관리 ───────────────────────────────────────────────────────────────────
const asStatusColors: Record<AsItem['status'], string> = {
  접수: 'bg-yellow-100 text-yellow-700',
  처리중: 'bg-blue-100 text-blue-700',
  완료: 'bg-green-100 text-green-700',
}

function AsTab({ siteId }: { siteId: string }) {
  const [list, setList] = useState<AsItem[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ date: '', description: '', status: '접수' as AsItem['status'], note: '' })

  useEffect(() => {
    storage.asItems.list().then(all => setList(all.filter(a => a.siteId === siteId)))
  }, [siteId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) return
    if (editId) {
      const updated: AsItem = { ...list.find(a => a.id === editId)!, ...form }
      await storage.asItems.upsert(updated)
      setList(prev => prev.map(a => a.id === editId ? updated : a))
    } else {
      const newItem: AsItem = { id: newId(), siteId, ...form }
      await storage.asItems.upsert(newItem)
      setList(prev => [...prev, newItem])
    }
    setShow(false)
  }

  function openEdit(a: AsItem) {
    setEditId(a.id)
    setForm({ date: a.date, description: a.description, status: a.status, note: a.note })
    setShow(true)
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setEditId(null); setForm({ date: new Date().toISOString().slice(0, 10), description: '', status: '접수', note: '' }); setShow(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + AS 등록
        </button>
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-800">AS {editId ? '수정' : '등록'}</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">날짜</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">내용 *</label>
              <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">상태</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AsItem['status'] })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(['접수', '처리중', '완료'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">비고</label>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">저장</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">취소</button>
            </div>
          </form>
        </div>
      )}
      <div className="space-y-3">
        {list.length === 0 && <Empty text="등록된 AS 내역이 없습니다." />}
        {list.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${asStatusColors[a.status]}`}>{a.status}</span>
                  <span className="text-xs text-gray-400">{a.date}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">{a.description}</p>
                {a.note && <p className="text-xs text-gray-400 mt-1">비고: {a.note}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline">수정</button>
                <button onClick={async () => { if (!confirm('삭제?')) return; await storage.asItems.remove(a.id); setList(prev => prev.filter(x => x.id !== a.id)) }} className="text-xs text-red-500 hover:underline">삭제</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-gray-400 py-12 text-sm">{text}</p>
}
