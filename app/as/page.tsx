'use client'

import { useEffect, useState } from 'react'
import { AsItem, Site, newId, storage } from '../lib/storage'

type AsStatus = AsItem['status']
type Filter = '전체' | AsStatus

const STATUS_STYLE: Record<AsStatus, string> = {
  '접수':   'bg-blue-100 text-blue-700',
  '처리중': 'bg-yellow-100 text-yellow-700',
  '완료':   'bg-green-100 text-green-700',
}

const STATUS_NEXT: Record<AsStatus, AsStatus> = {
  '접수':   '처리중',
  '처리중': '완료',
  '완료':   '접수',
}

const emptyForm = {
  siteId: '', date: new Date().toISOString().slice(0, 10),
  description: '', status: '접수' as AsStatus, note: '',
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400'

export default function AsPage() {
  const [items, setItems]       = useState<AsItem[]>([])
  const [sites, setSites]       = useState<Site[]>([])
  const [filter, setFilter]     = useState<Filter>('전체')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm)

  useEffect(() => {
    Promise.all([storage.asItems.list(), storage.sites.list()])
      .then(([as, s]) => { setItems(as); setSites(s) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.siteId || !form.description.trim()) return
    const item: AsItem = { id: newId(), ...form }
    await storage.asItems.upsert(item)
    setItems(prev => [item, ...prev])
    setForm(emptyForm)
    setShowForm(false)
  }

  async function handleStatusCycle(item: AsItem) {
    const updated = { ...item, status: STATUS_NEXT[item.status] }
    await storage.asItems.upsert(updated)
    setItems(prev => prev.map(i => i.id === item.id ? updated : i))
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await storage.asItems.remove(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function siteName(siteId: string) {
    return sites.find(s => s.id === siteId)?.name ?? siteId
  }

  const filtered = filter === '전체' ? items : items.filter(i => i.status === filter)
  const sorted   = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-800">AS관리</h2>
        <button
          onClick={() => { setForm(emptyForm); setShowForm(true) }}
          className="bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-slate-800 transition min-h-[44px]"
        >
          + AS 접수
        </button>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['전체', '접수', '처리중', '완료'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors min-h-[44px] ${
              filter === f
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* 접수 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">AS 접수</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">현장 *</label>
                <select required value={form.siteId}
                  onChange={e => setForm({ ...form, siteId: e.target.value })}
                  className={inputCls}>
                  <option value="">현장 선택</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">접수일</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">AS 내용 *</label>
                <textarea required rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">상태</label>
                <select value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as AsStatus })}
                  className={inputCls}>
                  {(['접수', '처리중', '완료'] as AsStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">메모</label>
                <input type="text" value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <button type="submit"
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">저장</button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition">취소</button>
            </div>
          </form>
        </div>
      )}

      {/* 빈 화면 */}
      {items.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <p className="font-semibold text-slate-700 mb-1">등록된 AS가 없습니다</p>
          <p className="text-sm text-slate-400 mb-5">고객으로부터 AS 요청이 오면 접수하고 처리 상태를 관리하세요.</p>
          <button onClick={() => { setForm(emptyForm); setShowForm(true) }}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
            + AS 접수하기
          </button>
        </div>
      )}

      {/* 필터 결과 없음 */}
      {items.length > 0 && sorted.length === 0 && (
        <p className="text-center text-slate-400 py-12 text-sm">해당 상태의 AS가 없습니다.</p>
      )}

      {/* 모바일 카드 */}
      {sorted.length > 0 && (
        <div className="md:hidden space-y-3">
          {sorted.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{siteName(item.siteId)}</p>
                  <p className="text-slate-700 text-sm mt-1">{item.description}</p>
                </div>
                <button onClick={() => handleStatusCycle(item)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full shrink-0 min-h-[44px] flex items-center ${STATUS_STYLE[item.status]}`}>
                  {item.status}
                </button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-400 space-x-2">
                  <span>{item.date}</span>
                  {item.note && <span>· {item.note}</span>}
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 min-h-[44px] flex items-center">삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 데스크탑 테이블 */}
      {sorted.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
              <tr>
                {['현장명', '접수일', '내용', '상태', '메모', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{siteName(item.siteId)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[240px] truncate">{item.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => handleStatusCycle(item)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status]}`}>
                      {item.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{item.note || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
