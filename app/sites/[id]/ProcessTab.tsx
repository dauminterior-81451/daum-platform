'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import koLocale from '@fullcalendar/core/locales/ko'
import { useEffect, useRef, useState } from 'react'
import { ProcessItem, newId, storage } from '../../lib/storage'
import { fileStorage } from '../../lib/supabase'

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

function shiftDate(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().slice(0, 10)
}
const toFCEnd    = (d: string) => shiftDate(d, 1)
const fromFCEnd  = (d: string) => shiftDate(d, -1)
const today      = () => new Date().toISOString().slice(0, 10)

type FormState = {
  content: string
  startDate: string
  endDate: string
  description: string
  photos: string[]
  done: boolean
}

function blankForm(start = today(), end = today()): FormState {
  return { content: '', startDate: start, endDate: end, description: '', photos: [], done: false }
}

export default function ProcessTab({ siteId }: { siteId: string }) {
  const [list, setList]         = useState<ProcessItem[]>([])
  const [mounted, setMounted]   = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formId, setFormId]     = useState('')
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>(blankForm())
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 768)
    storage.processItems.listBySite(siteId).then(setList)
  }, [siteId])

  const events = list.map((item, idx) => {
    const c = item.done ? DONE_COLOR : PALETTE[idx % PALETTE.length]
    return {
      id: item.id,
      title: item.content,
      start: item.date,
      end: toFCEnd(item.endDate ?? item.date),
      backgroundColor: c.bg,
      borderColor: c.border,
      textColor: '#fff',
      classNames: item.done ? ['fc-process-done'] : [],
    }
  })

  function openNew(startDate: string, endDate = startDate) {
    const id = newId()
    setFormId(id)
    setEditId(null)
    setForm(blankForm(startDate, endDate))
    setShowForm(true)
  }

  function openEdit(item: ProcessItem) {
    setFormId(item.id)
    setEditId(item.id)
    setForm({
      content:     item.content,
      startDate:   item.date,
      endDate:     item.endDate ?? item.date,
      description: item.description ?? '',
      photos:      item.photos ?? [],
      done:        item.done,
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim() || !form.startDate) return
    const id      = editId ?? formId
    const endDate = form.endDate >= form.startDate ? form.endDate : form.startDate
    const item: ProcessItem = {
      id, siteId,
      content:     form.content.trim(),
      date:        form.startDate,
      endDate,
      description: form.description,
      photos:      form.photos,
      done:        editId ? form.done : false,
    }
    try {
      await storage.processItems.upsert(item)
      setList(prev => editId
        ? prev.map(p => p.id === editId ? item : p)
        : [...prev, item]
      )
      setShowForm(false)
    } catch (err) {
      console.error('공정 저장 실패:', err)
      alert('저장에 실패했습니다. DB 컬럼(description, photos, endDate)이 추가됐는지 확인해 주세요.')
    }
  }

  async function handleDelete() {
    if (!editId || !confirm('삭제하시겠습니까?')) return
    try {
      await storage.processItems.remove(editId)
      setList(prev => prev.filter(p => p.id !== editId))
      setShowForm(false)
    } catch (err) {
      console.error('공정 삭제 실패:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEventDrop(info: any) {
    const item = list.find(p => p.id === info.event.id)
    if (!item) return
    const updated = {
      ...item,
      date:    info.event.startStr as string,
      endDate: info.event.endStr ? fromFCEnd(info.event.endStr as string) : info.event.startStr as string,
    }
    await storage.processItems.upsert(updated)
    setList(prev => prev.map(p => p.id === item.id ? updated : p))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleEventResize(info: any) {
    const item = list.find(p => p.id === info.event.id)
    if (!item) return
    const updated = {
      ...item,
      date:    info.event.startStr as string,
      endDate: info.event.endStr ? fromFCEnd(info.event.endStr as string) : info.event.startStr as string,
    }
    await storage.processItems.upsert(updated)
    setList(prev => prev.map(p => p.id === item.id ? updated : p))
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const ext  = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
      const path = `process-photos/${siteId}/${formId}_${Date.now()}.${ext}`
      const url  = await fileStorage.upload('drawings', path, file)
      setForm(prev => ({ ...prev, photos: [...prev.photos, url] }))
    } catch (err) {
      console.error('사진 업로드 실패:', err)
    } finally {
      setUploading(false)
    }
  }

  if (!mounted) {
    return <div className="py-12 text-center text-sm text-slate-400">캘린더 로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => openNew(today())}
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
          dayMaxEvents={3}
          height="auto"
          eventClick={(info) => {
            const item = list.find(p => p.id === info.event.id)
            if (item) openEdit(item)
          }}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
        />
      </div>

      {/* 공정 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg flex flex-col max-h-[92vh]">

            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <h3 className="font-semibold text-slate-800">공정 {editId ? '수정' : '추가'}</h3>
              {editId && (
                <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-600 px-2 py-1">
                  삭제
                </button>
              )}
            </div>

            {/* 모달 내용 (스크롤) */}
            <form id="proc-form" onSubmit={handleSave} className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">

              {/* 공정명 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">공정명 *</label>
                <input
                  type="text"
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  required
                  autoFocus
                  lang="ko"
                  inputMode="text"
                  autoComplete="off"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* 날짜 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">시작일</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">종료일</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              {/* 작업 예정 내용 */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">작업 예정 내용</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  lang="ko"
                  placeholder="고객에게 안내할 작업 내용을 입력하세요"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>

              {/* 시공 사진 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-500">시공 사진</label>
                  <label className={`cursor-pointer text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition whitespace-nowrap ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? '업로드 중...' : '+ 사진 추가'}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
                {form.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {form.photos.map((url, i) => (
                      <div key={i} className="relative aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs leading-none hover:bg-black/80"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-lg py-6 text-center text-xs text-slate-400">
                    사진을 추가하면 고객 페이지에 표시됩니다
                  </div>
                )}
              </div>

              {/* 완료 여부 (수정 시) */}
              {editId && (
                <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={form.done}
                    onChange={e => setForm({ ...form, done: e.target.checked })}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span className="text-sm text-slate-700">공정 완료</span>
                </label>
              )}
            </form>

            {/* 하단 버튼 */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="submit"
                form="proc-form"
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm hover:bg-blue-700 font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
