'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import koLocale from '@fullcalendar/core/locales/ko'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ClientInquiry,
  ClientNotice,
  DrawingFile,
  ExtraPayment,
  MaterialFile,
  Material,
  ProcessItem,
  Settlement,
  Site,
  newId,
  storage,
} from '../../lib/storage'

type TabKey = 'home' | 'process' | 'material' | 'drawing' | 'payment' | 'inquiry'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home',     label: '홈',      icon: '🏠' },
  { key: 'process',  label: '공정',    icon: '📅' },
  { key: 'material', label: '자재',    icon: '📦' },
  { key: 'drawing',  label: '도면',    icon: '📄' },
  { key: 'payment',  label: '입금',    icon: '💳' },
  { key: 'inquiry',  label: '문의',    icon: '💬' },
]

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
  { key: 'deposit'  as const, label: '계약금' },
  { key: 'startup'  as const, label: '착수금' },
  { key: 'interim'  as const, label: '중도금' },
  { key: 'balance'  as const, label: '잔금' },
]

export default function ClientPage() {
  const { siteId } = useParams<{ siteId: string }>()

  const [site, setSite]               = useState<Site | null | undefined>(undefined)
  const [processes, setProcesses]     = useState<ProcessItem[]>([])
  const [materials, setMaterials]     = useState<Material[]>([])
  const [materialFiles, setMaterialFiles] = useState<MaterialFile[]>([])
  const [drawingFiles, setDrawingFiles]   = useState<DrawingFile[]>([])
  const [settlement, setSettlement]   = useState<Settlement | null>(null)
  const [extras, setExtras]           = useState<ExtraPayment[]>([])
  const [notices, setNotices]         = useState<ClientNotice[]>([])
  const [inquiries, setInquiries]     = useState<ClientInquiry[]>([])
  const [question, setQuestion]       = useState('')
  const [submitted, setSubmitted]     = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [isMobile, setIsMobile]       = useState(false)
  const [tab, setTab]                 = useState<TabKey>('home')
  const [detailItem, setDetailItem]   = useState<ProcessItem | null>(null)
  const inquiryEndRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    setIsMobile(window.innerWidth < 768)
    if (!siteId) return
    storage.sites.list().then(sites => setSite(sites.find(s => s.id === siteId) ?? null))
    storage.processItems.listBySite(siteId).then(setProcesses)
    storage.materials.list().then(all => setMaterials(all.filter(m => m.siteId === siteId)))
    storage.materialFiles.listBySite(siteId).then(setMaterialFiles)
    storage.drawingFiles.listBySite(siteId).then(setDrawingFiles)
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
    setInquiries(prev => [...prev, item])
    setQuestion('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
    setTimeout(() => inquiryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
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
    borderColor:     item.done ? '#64748b' : PALETTE[idx % PALETTE.length],
    textColor: '#fff',
    classNames: item.done ? ['fc-client-done'] : [],
  }))

  const doneCount  = processes.filter(p => p.done).length
  const totalCount = processes.length
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const sortedProcesses = [...processes].sort((a, b) => a.date.localeCompare(b.date))

  // ─── Tab content ─────────────────────────────────────────────────────────────

  function HomeTab() {
    return (
      <div className="space-y-5">

        {/* 공정 진행 요약 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-3">전체 공정 진행률</p>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-slate-800">{progress}%</span>
            <span className="text-sm text-slate-400">{doneCount} / {totalCount} 완료</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 공지사항 */}
        {notices.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 px-1">공지사항</p>
            <div className="space-y-2">
              {notices.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-2">{n.createdAt.slice(0, 10)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {notices.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>
    )
  }

  function ProcessTab() {
    if (!mounted) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          로딩 중...
        </div>
      )
    }
    if (processes.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          등록된 공정 내역이 없습니다.
        </div>
      )
    }

    if (isMobile) {
      return (
        <div className="space-y-2">
          {sortedProcesses.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 active:bg-slate-50"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.done ? '#94a3b8' : PALETTE[idx % PALETTE.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-slate-800 truncate ${item.done ? 'line-through text-slate-400' : ''}`}>
                  {item.content}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.date}{item.endDate && item.endDate !== item.date ? ` ~ ${item.endDate}` : ''}
                </p>
              </div>
              {item.done && (
                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">완료</span>
              )}
              <span className="text-slate-300 text-sm">›</span>
            </button>
          ))}
        </div>
      )
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 overflow-hidden">
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
          initialView="dayGridMonth"
          locale={koLocale}
          headerToolbar={{ left: 'prev,next', center: 'title', right: 'dayGridMonth,listMonth' }}
          buttonText={{ today: '오늘', month: '월간', list: '목록' }}
          events={calendarEvents}
          editable={false}
          selectable={false}
          dayMaxEvents={3}
          height="auto"
          eventClick={(info) => {
            const item = processes.find(p => p.id === info.event.id)
            if (item) setDetailItem(item)
          }}
        />
      </div>
    )
  }

  function MaterialTab() {
    const hasImages = materialFiles.length > 0
    return (
      <div className="space-y-5">
        {materials.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[320px]">
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
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            등록된 자재 정보가 없습니다.
          </div>
        )}

        {hasImages && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 px-1">자재 이미지</p>
            <div className="grid grid-cols-2 gap-2">
              {materialFiles.map(f => (
                <div key={f.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {f.fileType?.startsWith('image/') ? (
                    <img src={f.url} alt={f.name} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center text-slate-300 text-3xl">📄</div>
                  )}
                  <p className="text-xs text-slate-500 px-2 py-1.5 truncate">{f.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function DrawingTab() {
    if (drawingFiles.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          등록된 도면/파일이 없습니다.
        </div>
      )
    }
    return (
      <div className="space-y-2">
        {drawingFiles.map(f => (
          <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <span className="text-2xl shrink-0">
              {f.fileType?.startsWith('image/') ? '🖼️' : '📄'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{f.createdAt?.slice(0, 10) ?? ''}</p>
            </div>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              다운로드
            </a>
          </div>
        ))}
      </div>
    )
  }

  function PaymentTab() {
    return (
      <div className="space-y-5">
        {settlement ? (
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
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            입금 정보가 없습니다.
          </div>
        )}
      </div>
    )
  }

  function InquiryTab() {
    const sorted = [...inquiries].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt)
    )
    return (
      <div className="flex flex-col gap-4">
        {/* 채팅 목록 */}
        <div className="space-y-3">
          {sorted.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-8">
              문의를 남겨보세요.
            </div>
          )}
          {sorted.map(iq => (
            <div key={iq.id} className="space-y-2">
              {/* 고객 질문 — 오른쪽 파란 말풍선 */}
              <div className="flex justify-end">
                <div className="max-w-[78%]">
                  <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
                    {iq.question}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-right">{iq.createdAt.slice(0, 10)}</p>
                </div>
              </div>
              {/* 관리자 답변 — 왼쪽 회색 말풍선 */}
              <div className="flex justify-start">
                <div className="max-w-[78%]">
                  <p className="text-xs text-slate-400 mb-1 px-1">관리자</p>
                  {iq.answer ? (
                    <div className="bg-slate-100 text-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
                      {iq.answer}
                    </div>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm italic">
                      답변 준비 중입니다.
                    </div>
                  )}
                  {iq.answeredAt && (
                    <p className="text-xs text-slate-400 mt-1 px-1">{iq.answeredAt.slice(0, 10)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={inquiryEndRef} />
        </div>

        {/* 문의 입력 폼 */}
        <form
          onSubmit={submitQuestion}
          className="bg-white rounded-2xl border border-slate-200 p-4 sticky bottom-[calc(56px+env(safe-area-inset-bottom)+1rem)] md:static shadow-sm"
        >
          <label className="text-xs text-slate-500 mb-1.5 block">궁금하신 사항을 남겨주세요</label>
          <div className="flex gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="문의 내용 입력"
              lang="ko"
              inputMode="text"
              autoComplete="off"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 text-sm px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              전송
            </button>
          </div>
          {submitted && (
            <p className="text-xs text-green-600 mt-2">문의가 접수되었습니다.</p>
          )}
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* 고정 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-4 text-center shadow-sm">
        <p className="text-xs text-slate-400 mb-0.5">공사 현황</p>
        <h1 className="text-lg font-bold text-slate-800">{site.name}</h1>
        {site.customerName && (
          <p className="text-sm text-slate-500 mt-0.5">{site.customerName} 고객님</p>
        )}
      </div>

      {/* 데스크톱 가로 탭바 */}
      <div className="hidden md:flex sticky top-[73px] z-20 bg-white border-b border-slate-200 px-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 본문 */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-[calc(56px+env(safe-area-inset-bottom)+1.25rem)] md:pb-8">
        {tab === 'home'     && <HomeTab />}
        {tab === 'process'  && <ProcessTab />}
        {tab === 'material' && <MaterialTab />}
        {tab === 'drawing'  && <DrawingTab />}
        {tab === 'payment'  && <PaymentTab />}
        {tab === 'inquiry'  && <InquiryTab />}
      </div>

      {/* 모바일 하단 네비게이션 바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] py-2 transition-colors ${
                tab === t.key ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className={`text-[10px] font-medium ${tab === t.key ? 'text-blue-600' : 'text-slate-400'}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* 공정 상세 팝업 */}
      {detailItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">{detailItem.content}</h3>
                {detailItem.done && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">완료</span>
                )}
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
              {/* 날짜 */}
              <div className="text-sm text-slate-500">
                {detailItem.date}
                {detailItem.endDate && detailItem.endDate !== detailItem.date
                  ? ` ~ ${detailItem.endDate}` : ''}
              </div>

              {/* 작업 예정 내용 */}
              {detailItem.description && (
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">작업 내용</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl px-4 py-3">
                    {detailItem.description}
                  </p>
                </div>
              )}

              {/* 시공 사진 */}
              {(detailItem.photos ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">시공 사진</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(detailItem.photos ?? []).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt=""
                          className="w-full aspect-square object-cover rounded-xl"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!detailItem.description && (detailItem.photos ?? []).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">등록된 상세 내용이 없습니다.</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setDetailItem(null)}
                className="w-full border border-slate-200 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block text-center py-6 text-xs text-slate-300">
        다움인테리어
      </div>
    </div>
  )
}
