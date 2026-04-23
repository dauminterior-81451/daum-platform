'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { newId, Site, SITE_STATUS_LABELS, SiteStatus, storage } from '../lib/storage'

const STATUS_BADGE: Record<SiteStatus, string> = {
  pre_contract: 'bg-slate-100 text-slate-600',
  in_progress:  'bg-blue-100 text-blue-700',
  completed:    'bg-green-100 text-green-700',
}

const emptyForm = {
  name: '',
  customerId: '',
  address: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  startDate: '',
  status: 'pre_contract' as SiteStatus,
  memo: '',
}

export default function SitesPage() {
  const [sites, setSites]           = useState<Site[]>([])
  const [form, setForm]             = useState(emptyForm)
  const [editId, setEditId]         = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [filterStatus, setFilterStatus] = useState<SiteStatus | '전체'>('전체')

  useEffect(() => {
    storage.sites.list().then(setSites)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      const updated: Site = { ...sites.find(s => s.id === editId)!, ...form }
      await storage.sites.upsert(updated)
      setSites(prev => prev.map(s => s.id === editId ? updated : s))
    } else {
      const newSite: Site = { id: newId(), createdAt: new Date().toISOString(), ...form }
      await storage.sites.upsert(newSite)
      setSites(prev => [...prev, newSite])
    }
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
  }

  function handleEdit(s: Site) {
    setForm({
      name: s.name,
      customerId: s.customerId,
      address: s.address,
      customerName:  s.customerName  ?? '',
      customerPhone: s.customerPhone ?? '',
      customerEmail: s.customerEmail ?? '',
      startDate: s.startDate,
      status: s.status,
      memo: s.memo,
    })
    setEditId(s.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await storage.sites.remove(id)
    setSites(prev => prev.filter(s => s.id !== id))
  }

  const filtered =
    filterStatus === '전체' ? sites : sites.filter(s => s.status === filterStatus)

  const FILTER_OPTIONS: ({ key: SiteStatus | '전체'; label: string })[] = [
    { key: '전체',         label: '전체'   },
    { key: 'pre_contract', label: '계약전' },
    { key: 'in_progress',  label: '진행중' },
    { key: 'completed',    label: '완료'   },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">현장관리</h2>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 현장 등록
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col max-h-[90vh]"
          >
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editId ? '현장 수정' : '현장 등록'}</h3>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {/* 고객 정보 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">고객 정보</p>
                <div className="space-y-3">
                  {([
                    { label: '고객명',   key: 'customerName'  as const, type: 'text'  },
                    { label: '연락처',   key: 'customerPhone' as const, type: 'text'  },
                    { label: '이메일',   key: 'customerEmail' as const, type: 'email' },
                  ]).map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 현장 정보 */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">현장 정보</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">현장명 *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">주소</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">착공일</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">상태</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as SiteStatus })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {(['pre_contract', 'in_progress', 'completed'] as SiteStatus[]).map((s) => (
                        <option key={s} value={s}>{SITE_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">메모</label>
                    <input
                      type="text"
                      value={form.memo}
                      onChange={(e) => setForm({ ...form, memo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
                저장
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">등록된 현장이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                {['고객명', '연락처', '이메일', '현장명', '주소', '상태', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{s.customerName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.customerPhone || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.customerEmail || '-'}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/sites/${s.id}`} className="hover:text-blue-600">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.address || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {SITE_STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <Link href={`/sites/${s.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                    <button onClick={() => handleEdit(s)} className="text-xs text-gray-500 hover:underline">수정</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">삭제</button>
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
