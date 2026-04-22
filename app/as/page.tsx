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
  siteId:      '',
  date:        new Date().toISOString().slice(0, 10),
  description: '',
  status:      '접수' as AsStatus,
  note:        '',
}

export default function AsPage() {
  const [items, setItems]     = useState<AsItem[]>([])
  const [sites, setSites]     = useState<Site[]>([])
  const [filter, setFilter]   = useState<Filter>('전체')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState(emptyForm)

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">AS관리</h2>
        <button
          onClick={() => { setForm(emptyForm); setShowForm(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + AS 접수
        </button>
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4">
        {(['전체', '접수', '처리중', '완료'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 접수 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg w-full max-w-md"
          >
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">AS 접수</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">현장 *</label>
                <select
                  required
                  value={form.siteId}
                  onChange={e => setForm({ ...form, siteId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">현장 선택</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">접수일</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">AS 내용 *</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">상태</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as AsStatus })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(['접수', '처리중', '완료'] as AsStatus[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">메모</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
                저장
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목록 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">AS 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                {['현장명', '접수일', '내용', '상태', '메모', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{siteName(item.siteId)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-[240px] truncate">{item.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleStatusCycle(item)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status]}`}
                    >
                      {item.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{item.note || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
