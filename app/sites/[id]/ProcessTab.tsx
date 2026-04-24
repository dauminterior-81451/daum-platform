'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import koLocale from '@fullcalendar/core/locales/ko'
import { useEffect, useState } from 'react'
import { ProcessItem, newId, storage } from '../../lib/storage'

// 공정별 색상 팔레트
const PALETTE = [
  { bg: '#3b82f6', border: '#2563eb' },
  { bg: '#10b981', border: '#059669' },
  { bg: '#f59e0b', border: '#d97706' },
  { bg: '#8b5cf6', border: '#7c3aed' },
  { bg: '#ef4444', border: '#dc2626' },
  { bg: '#06b6d4', border: '#0891b2' },
  { bg: '#f97316', border: '#ea580c' },
  { bg: '#84cc16', border: '#65a30d' },
]
const DONE_COLOR = { bg: '#94a3b8', border: '#64748b' }

// 날짜 계산 헬퍼 (YYYY-MM-DD 기준)
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
// inclusive endDate → exclusive end for FullCalendar
function toFCEnd(endDate: string) { return shiftDate(endDate, 1) }
// exclusive endStr from FullCalendar → inclusive endDate for storage
function fromFCEnd(excEnd: string) { return shiftDate(excEnd, -1) }

type FormState = { content: string; startDate: string; endDate: string }

export default function ProcessTab({ siteId }: { siteId: string }) {
  const [list, setList]         = useState<ProcessItem[]>([])
  const [mounted, setMounted]   = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [show, setShow]         = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>({ content: '', startDate: '', endDate: '' })
  const [popup, setPopup]       = useState<ProcessItem | null>(null)

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 768)
    storage.processItems.listBySite(siteId).then(setList)
  }, [siteId])

  // FullCalendar 이벤트 배열
  const events = list.map((item, idx) => {
    const color = item.done ? DONE_COLOR : PALETTE[idx % PALETTE.length]
    return {
      id: item.id,
      title: item.content,
      start: item.date,
      end: toFCEnd(item.endDate ?? item.date),
      backgroundColor: color.bg,
      borderColor: color.border,
      textColor: '#fff',
      classNames: item.done ? ['fc-process-done'] : [],
    }
  })

  function openNew(startDate: string, endDate = startDate) {
    setEditId(null)
    setForm({ content: '', startDate, endDate })
    setShow(true)
  }

  function openEdit(item: ProcessItem) {
    setPopup(null)
    setEditId(item.id)
    setForm({ content: item.content, startDate: item.date, endDate: item.endDate ?? item.date })
    setShow(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim() || !form.startDate) return
    const endDate = form.endDate >= form.startDate ? form.endDate : form.startDate
    if (editId) {
      const orig = list.find(p => p.id === editId)!
      const updated: ProcessItem = { ...orig, content: form.content.trim(), date: form.startDate, endDate }
      await storage.processItems.upsert(updated)
      setList(prev => prev.map(p => p.id === editId ? updated : p))
    } else {
      const item: ProcessItem = {
        id: newId(), siteId,
        content: form.content.trim(),
        date: form.startDate, endDate, done: false,
      }
      await storage.processItems.upsert(item)
      setList(prev => [...prev, item])
    }
    setShow(false)
  }

  async function handleDelete(item: ProcessItem) {
    if (!confirm('삭제하시겠습니까?')) return
    await storage.processItems.remove(item.id)
    setList(prev => prev.filter(p => p.id !== item.id))
    setPopup(null)
  }

  async function toggleDone(item: ProcessItem) {
    const updated = { ...item, done: !item.done }
    await storage.processItems.upsert(updated)
    setList(prev => prev.map(p => p.id === item.id ? updated : p))
    setPopup(updated)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEventDrop(info: any) {
    const item = list.find(p => p.id === info.event.id)
    if (!item) return
    const newDate    = info.event.startStr as string
    const newEndDate = info.event.endStr ? fromFCEnd(info.event.endStr as string) : newDate
    const updated    = { ...item, date: newDate, endDate: newEndDate }
    await storage.processItems.upsert(updated)
    setList(prev => prev.map(p => p.id === item.id ? updated : p))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEventResize(info: any) {
    const item = list.find(p => p.id === info.event.id)
    if (!item) return
    const newDate    = info.event.startStr as string
    const newEndDate = info.event.endStr ? fromFCEnd(info.event.endStr as string) : newDate
    const updated    = { ...item, date: newDate, endDate: newEndDate }
    await storage.processItems.upsert(updated)
    setList(prev => prev.map(p => p.id === item.id ? updated : p))
  }

  if (!mounted) {
    return <div className="py-12 text-center text-sm text-slate-400">캘린더 로딩 중...</div>
  }

  return (
    <div>
      {/* 공정 추가 버튼 */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => openNew(new Date().toISOString().slice(0, 10))}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 공정 추가
        </button>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 overflow-hidden">
        <style>{`
          .fc { font-size: 0.82rem; }
          .fc .fc-toolbar-title { font-size: 0.95rem; font-weight: 700; }
          .fc .fc-button { font-size: 0.72rem; padding: 0.28rem 0.55rem; border-radius: 0.375rem; }
          .fc .fc-button-primary { background-color: #1e293b; border-color: #1e293b; }
          .fc .fc-button-primary:hover { background-color: #0f172a; border-color: #0f172a; }
          .fc .fc-button-primary:not(:disabled).fc-button-active { background-color: #3b82f6; border-color: #3b82f6; }
          .fc .fc-today-button { background-color: #64748b; border-color: #64748b; }
          .fc-process-done .fc-event-title { text-decoration: line-through; opacity: 0.8; }
          .fc-list-event-title { font-size: 0.82rem; }
          .fc .fc-list-day-cushion { background-color: #f8fafc; }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
          initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
          locale={koLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'listMonth' : 'dayGridMonth,listMonth',
          }}
          buttonText={{ today: '오늘', month: '월간', list: '목록' }}
          events={events}
          editable
          selectable
          selectMirror
          dayMaxEvents={3}
          height="auto"
          select={(info) => {
            openNew(info.startStr, fromFCEnd(info.endStr))
          }}
          eventClick={(info) => {
            const item = list.find(p => p.id === info.event.id)
            if (item) setPopup(item)
          }}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
        />
      </div>

      {/* 공정 추가/수정 모달 */}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-800">공정 {editId ? '수정' : '추가'}</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">공정명 *</label>
              <input
                type="text"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required
                autoFocus
                lang="ko"
                inputMode="text"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">시작일</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">종료일</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
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

      {/* 이벤트 클릭 팝업 */}
      {popup && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-lg p-5 w-full max-w-xs"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-semibold text-slate-800 mb-0.5">{popup.content}</p>
            <p className="text-xs text-slate-400 mb-4">
              {popup.date}
              {popup.endDate && popup.endDate !== popup.date ? ` ~ ${popup.endDate}` : ''}
            </p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none mr-auto">
                <input
                  type="checkbox"
                  checked={popup.done}
                  onChange={() => toggleDone(popup)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm text-slate-600">완료</span>
              </label>
              <button
                onClick={() => openEdit(popup)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-slate-50"
              >
                수정
              </button>
              <button
                onClick={() => handleDelete(popup)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
            <button
              onClick={() => setPopup(null)}
              className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 text-center"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
