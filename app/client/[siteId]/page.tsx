'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import koLocale from '@fullcalendar/core/locales/ko'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ClientInquiry,
  ClientNotice,
  ExtraPayment,
  Material,
  ProcessItem,
  Settlement,
  Site,
  newId,
  storage,
} from '../../lib/storage'

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
]
function toFCEnd(endDate: string) {
  const d = new Date(endDate + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const STAGES = [
  { key: 'deposit' as const, label: '계약금' },
  { key: 'startup' as const, label: '착수금' },
  { key: 'interim' as const, label: '중도금' },
  { key: 'balance' as const, label: '잔금' },
]

export default function ClientPage() {
  const { siteId } = useParams<{ siteId: string }>()

  const [site, setSite]             = useState<Site | null | undefined>(undefined)
  const [processes, setProcesses]   = useState<ProcessItem[]>([])
  const [materials, setMaterials]   = useState<Material[]>([])
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [extras, setExtras]         = useState<ExtraPayment[]>([])
  const [notices, setNotices]       = useState<ClientNotice[]>([])
  const [inquiries, setInquiries]   = useState<ClientInquiry[]>([])
  const [question, setQuestion]     = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [mounted, setMounted]       = useState(false)
  const [isMobile, setIsMobile]     = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 768)
    if (!siteId) return
    storage.sites.list().then(sites => setSite(sites.find(s => s.id === siteId) ?? null))
    storage.processItems.listBySite(siteId).then(setProcesses)
    storage.materials.list().then(all => setMaterials(all.filter(m => m.siteId === siteId)))
    storage.settlements.get(siteId).then(setSettlement)
    storage.extraPayments.listBySite(siteId).then(setExtras)
    storage.clientNotices.listBySite(siteId).then(setNotices)
    storage.clientInquiries.listBySite(siteId).then(setInquiries)
  }, [siteId])

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || !siteId) return
    const item: ClientInquiry = {
      id: newId(),
      siteId,
      question: question.trim(),
      answer: '',
      createdAt: new Date().toISOString(),
      answeredAt: '',
    }
    await storage.clientInquiries.upsert(item)
    setInquiries(prev => [item, ...prev])
    setQuestion('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  if (site === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        로딩 중...
      </div>
    )
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        현장을 찾을 수 없습니다.
      </div>
    )
  }

  const calendarEvents = processes.map((item, idx) => ({
    id: item.id,
    title: item.content,
    start: item.date,
    end: toFCEnd(item.endDate ?? item.date),
    backgroundColor: item.done ? '#94a3b8' : PALETTE[idx % PALETTE.length],
    borderColor: item.done ? '#64748b' : PALETTE[idx % PALETTE.length],
    textColor: '#fff',
    classNames: item.done ? ['fc-client-done'] : [],
  }))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-4 py-6 text-center">
        <p className="text-xs text-slate-400 mb-1">공사 현황</p>
        <h1 className="text-xl font-bold text-slate-800">{site.name}</h1>
        {site.customerName && (
          <p className="text-sm text-slate-500 mt-1">{site.customerName} 고객님</p>
        )}
        {site.startDate && (
          <p className="text-xs text-slate-400 mt-0.5">계약일: {site.startDate}</p>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

        {/* 공정 현황 */}
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">공정 현황</h2>
          {!mounted ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              로딩 중...
            </div>
          ) : processes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              등록된 공정 내역이 없습니다.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 overflow-hidden">
              <style>{`
                .fc-client-done .fc-event-title { text-decoration: line-through; opacity: 0.8; }
                .fc { font-size: 0.82rem; }
                .fc .fc-toolbar-title { font-size: 0.9rem; font-weight: 700; }
                .fc .fc-button { font-size: 0.72rem; padding: 0.28rem 0.55rem; border-radius: 0.375rem; }
                .fc .fc-button-primary { background-color: #1e293b; border-color: #1e293b; }
                .fc .fc-button-primary:hover { background-color: #0f172a; border-color: #0f172a; }
                .fc .fc-button-primary:not(:disabled).fc-button-active { background-color: #3b82f6; border-color: #3b82f6; }
                .fc .fc-list-day-cushion { background-color: #f8fafc; }
                .fc-list-event-title { font-size: 0.82rem; }
              `}</style>
              <FullCalendar
                plugins={[dayGridPlugin, listPlugin]}
                initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
                locale={koLocale}
                headerToolbar={{
                  left: 'prev,next',
                  center: 'title',
                  right: 'dayGridMonth,listMonth',
                }}
                buttonText={{ today: '오늘', month: '월간', list: '목록' }}
                events={calendarEvents}
                editable={false}
                selectable={false}
                dayMaxEvents={3}
                height="auto"
              />
            </div>
          )}
        </section>

        {/* 자재 정보 */}
        {materials.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-600 mb-3">자재 정보</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[360px]">
                  <thead className="bg-slate-50 text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">자재명</th>
                      <th className="px-4 py-3 text-left font-medium">규격</th>
                      <th className="px-4 py-3 text-left font-medium">브랜드</th>
                      <th className="px-4 py-3 text-left font-medium">수량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {materials.map(m => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-3 text-slate-500">{m.spec || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{m.supplier || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{m.qty}{m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 입금 현황 */}
        {settlement && (
          <section>
            <h2 className="text-sm font-semibold text-slate-600 mb-3">입금 현황</h2>
            <div className="space-y-2">
              {STAGES.map(({ key, label }) => {
                const s = settlement[key]
                if (!s) return null
                return (
                  <div
                    key={key}
                    className={`bg-white rounded-xl border p-4 flex items-center justify-between ${
                      s.paid ? 'border-green-200' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700">{label}</p>
                      {s.scheduledDate && (
                        <p className="text-xs text-slate-400 mt-0.5">예정일: {s.scheduledDate}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">
                        {(s.amount || 0).toLocaleString()}원
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.paid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {s.paid ? '입금완료' : '미입금'}
                      </span>
                    </div>
                  </div>
                )
              })}

              {extras.length > 0 && (
                <>
                  <p className="text-xs text-slate-400 pt-1 px-1">추가금</p>
                  {extras.map(ex => (
                    <div
                      key={ex.id}
                      className={`bg-white rounded-xl border p-4 flex items-center justify-between ${
                        ex.paid ? 'border-green-200' : 'border-orange-200'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">{ex.title}</p>
                        {ex.scheduledDate && (
                          <p className="text-xs text-slate-400 mt-0.5">예정일: {ex.scheduledDate}</p>
                        )}
                        {ex.memo && <p className="text-xs text-slate-400">{ex.memo}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {(ex.amount || 0).toLocaleString()}원
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ex.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {ex.paid ? '납부완료' : '미납'}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        )}

        {/* 공지사항 */}
        {notices.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-600 mb-3">공지사항</h2>
            <div className="space-y-2">
              {notices.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-700">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{n.createdAt.slice(0, 10)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 고객 문의 */}
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">고객 문의</h2>

          <form onSubmit={submitQuestion} className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <label className="text-xs text-slate-500 mb-1.5 block">궁금하신 사항을 남겨주세요</label>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="문의 내용 입력"
                lang="ko"
                inputMode="text"
                autoComplete="off"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                className="shrink-0 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                전송
              </button>
            </div>
            {submitted && (
              <p className="text-xs text-green-600 mt-2">문의가 접수되었습니다.</p>
            )}
          </form>

          {inquiries.length > 0 && (
            <div className="space-y-3">
              {inquiries.map(iq => (
                <div key={iq.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">{iq.createdAt.slice(0, 10)} · 문의</p>
                    <p className="text-sm text-slate-700">{iq.question}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-500 font-medium mb-1">답변</p>
                    {iq.answer
                      ? <p className="text-sm text-blue-800">{iq.answer}</p>
                      : <p className="text-xs text-slate-400 italic">답변 준비 중입니다.</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      <div className="text-center py-8 text-xs text-slate-300">
        다움인테리어
      </div>
    </div>
  )
}
