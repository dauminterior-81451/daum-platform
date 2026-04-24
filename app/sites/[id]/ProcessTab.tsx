'use client'

import { useEffect, useState } from 'react'
import { ProcessItem, newId, storage } from '../../lib/storage'

export default function ProcessTab({ siteId }: { siteId: string }) {
  const [list, setList] = useState<ProcessItem[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ date: '', content: '' })

  useEffect(() => {
    storage.processItems.listBySite(siteId).then(setList)
  }, [siteId])

  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))

  function openNew() {
    setEditId(null)
    setForm({ date: new Date().toISOString().slice(0, 10), content: '' })
    setShow(true)
  }

  function openEdit(p: ProcessItem) {
    setEditId(p.id)
    setForm({ date: p.date, content: p.content })
    setShow(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return
    if (editId) {
      const updated: ProcessItem = { ...list.find(p => p.id === editId)!, ...form }
      await storage.processItems.upsert(updated)
      setList(prev => prev.map(p => p.id === editId ? updated : p))
    } else {
      const item: ProcessItem = { id: newId(), siteId, ...form, done: false }
      await storage.processItems.upsert(item)
      setList(prev => [...prev, item])
    }
    setShow(false)
  }

  async function toggleDone(p: ProcessItem) {
    const updated = { ...p, done: !p.done }
    await storage.processItems.upsert(updated)
    setList(prev => prev.map(x => x.id === p.id ? updated : x))
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await storage.processItems.remove(id)
    setList(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={openNew}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 공정 추가
        </button>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-800">공정 {editId ? '수정' : '추가'}</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">공정 내용 *</label>
              <input
                type="text"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required
                lang="ko"
                inputMode="text"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
                저장
              </button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-center text-gray-400 py-12 text-sm">등록된 공정이 없습니다.</p>
        )}
        {sorted.map(p => (
          <div
            key={p.id}
            className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 ${
              p.done ? 'border-green-200' : 'border-slate-200'
            }`}
          >
            <input
              type="checkbox"
              checked={p.done}
              onChange={() => toggleDone(p)}
              className="w-4 h-4 accent-green-600 cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-400">{p.date}</span>
              <p className={`text-sm font-medium mt-0.5 ${p.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {p.content}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">수정</button>
              <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
