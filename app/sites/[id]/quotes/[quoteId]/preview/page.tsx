'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { storage, QuoteItem, Quote, Site, Customer, EmailLog } from '../../../../../lib/storage'

type PItem  = { name: string; desc: string; qty: number; unit: string; unitPrice: number }
type PGroup = { name: string; items: PItem[] }

function parseGroups(items: QuoteItem[]): PGroup[] {
  const groups: PGroup[] = []
  let cur: PGroup | null = null
  for (const item of items) {
    if (item.unit === '__group__') { cur = { name: item.name, items: [] }; groups.push(cur) }
    else if (cur) cur.items.push({ name: item.name, desc: item.desc ?? '', qty: item.qty, unit: item.unit, unitPrice: item.unitPrice })
  }
  return groups
}

export default function QuotePreviewPage() {
  const { id: siteId, quoteId } = useParams<{ id: string; quoteId: string }>()
  const searchParams             = useSearchParams()
  const isCustomer               = searchParams.get('mode') === 'customer'
  const [sending, setSending]   = useState(false)
  const [quote, setQuote]       = useState<Quote | null>(null)
  const [site, setSite]         = useState<Site | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading]   = useState(true)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])

  const fetchLogs = useCallback(() => {
    storage.emailLogs.listByEstimate(quoteId).then(setEmailLogs)
  }, [quoteId])

  useEffect(() => {
    Promise.all([
      storage.quotes.list(),
      storage.sites.list(),
      storage.customers.list(),
    ]).then(([quotes, sites, customers]) => {
      const q = quotes.find(q => q.id === quoteId) ?? null
      const s = sites.find(s => s.id === siteId) ?? null
      const c = s ? (customers.find(c => c.id === s.customerId) ?? null) : null
      setQuote(q); setSite(s); setCustomer(c)
      setLoading(false)
    })
  }, [quoteId, siteId])

  useEffect(() => {
    if (!isCustomer) fetchLogs()
  }, [isCustomer, fetchLogs])

  if (loading) return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
      <p className="text-slate-400 text-sm">로딩 중...</p>
    </div>
  )

  if (!quote || !site) return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-slate-500 text-sm">견적서를 찾을 수 없습니다.</p>
        <Link href={`/sites/${siteId}`} className="text-blue-600 hover:underline text-sm">← 뒤로가기</Link>
      </div>
    </div>
  )

  const groups  = parseGroups(quote.items)
  const supply  = quote.items.filter(i => i.unit !== '__group__').reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const tm      = quote.taxMode ?? 'exc'
  const taxAmt  = tm === 'exc' ? Math.round(supply * 0.1) : tm === 'inc' ? supply - Math.round(supply / 1.1) : 0
  const total   = tm === 'exc' ? supply + taxAmt : supply
  const rev     = quote.revision ?? 1

  function handleDownloadPdf() {
    const prev = document.title
    document.title = `다움인테리어_견적서_${rev}차견적`
    window.print()
    document.title = prev
  }

  async function handleSendEmail() {
    if (!site || !quote) return
    const email = site.customerEmail || customer?.email
    if (!email) { alert('고객 이메일이 없습니다.'); return }

    const previewUrl = window.location.href.split('?')[0] + '?mode=customer'
    const customerName = site.customerName || customer?.name || '고객'
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b;margin-bottom:4px">다움인테리어 견적서</h2>
        <p style="color:#64748b;font-size:14px;margin-top:0">${rev}차 견적 ${rev === 1 ? '(최초)' : '(수정)'}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
        <table style="width:100%;font-size:14px;color:#334155">
          <tr><td style="padding:6px 0;color:#94a3b8;width:80px">고객명</td><td>${customerName}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">현장명</td><td>${site.name}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">견적금액</td><td style="font-weight:700;color:#0f172a">${total.toLocaleString()}원</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8">견적일</td><td>${quote.date}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
        <a href="${previewUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">견적서 미리보기</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">본 메일은 다움인테리어 업무관리 시스템에서 자동 발송되었습니다.</p>
      </div>
    `

    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `[다움인테리어] 견적서 - ${site.name} (${rev}차)`,
          html,
          siteId,
          estimateId: quoteId,
          recipientName: customerName,
          sendType: 'estimate',
        }),
      })
      if (res.ok) {
        alert('발송 완료!')
        fetchLogs()
      } else {
        const data = await res.json()
        alert(`발송 실패: ${data.error ?? '알 수 없는 오류'}`)
        fetchLogs()
      }
    } catch {
      alert('발송 실패: 네트워크 오류')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          body > * { visibility: hidden; }
          .print-doc, .print-doc * { visibility: visible; }
          .print-doc { position: fixed !important; inset: 0 !important; overflow: visible !important; }
          @page { size: A4; margin: 10mm; }
        }
        ${isCustomer ? 'aside { display: none !important; }' : ''}
      `}</style>
      <div className="print-doc fixed inset-0 z-[100] bg-white overflow-auto">
        <div id="quote-print-area" className="max-w-3xl mx-auto px-8 py-10">

          {/* 헤더 */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-800">
            <div>
              <p className="text-xs text-slate-400 tracking-widest mb-0.5">DAUM INTERIOR</p>
              <h1 className="text-2xl font-extrabold text-slate-900">다움인테리어</h1>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-extrabold tracking-[0.3em] text-slate-800">견 적 서</h2>
              <p className="text-sm text-slate-500 mt-1">견적일: {quote.date}</p>
              <span className="text-xs font-semibold text-slate-600">
                {rev}차 견적 {rev === 1 ? '(최초)' : '(수정)'}
              </span>
            </div>
          </div>

          {/* 고객 정보 */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 p-5 bg-slate-50 rounded-xl border border-slate-200">
            {[
              { label: '고객명',    value: site.customerName  || customer?.name  || '-' },
              { label: '현장명',    value: site.name },
              { label: '연락처',    value: site.customerPhone || customer?.phone || '-' },
              { label: '현장주소',  value: site.address },
              { label: '이메일',    value: site.customerEmail || customer?.email || '-' },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-3 text-sm">
                <span className="text-slate-400 w-16 shrink-0">{label}</span>
                <span className="font-medium text-slate-800">{value}</span>
              </div>
            ))}
          </div>

          {/* 품목/항목 테이블 */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {['품목', '항목명', '내용', '단가', '수량', '단위', '금액'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              {groups.map((g, gi) => {
                const valid    = g.items.filter(i => i.name.trim())
                const subtotal = valid.reduce((s, i) => s + i.qty * i.unitPrice, 0)
                return (
                  <tbody key={gi} className="border-t-2 border-slate-200">
                    <tr className="bg-slate-100">
                      <td colSpan={6} className="px-3 py-2 font-semibold text-slate-700 text-xs">
                        {g.name || '(품목)'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700 text-xs">
                        {subtotal.toLocaleString()}원
                      </td>
                    </tr>
                    {valid.map((item, ii) => (
                      <tr key={ii} className={`border-t border-slate-100 ${ii % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                        <td className="px-3 py-2 text-slate-300 text-xs pl-5">└</td>
                        <td className="px-3 py-2 text-slate-800">{item.name}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs whitespace-pre-wrap max-w-[140px]">{item.desc}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{item.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">{item.qty}</td>
                        <td className="px-3 py-2 text-center">{item.unit}</td>
                        <td className="px-3 py-2 text-right font-medium">{(item.qty * item.unitPrice).toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                )
              })}
            </table>
          </div>

          {/* 합계 */}
          <div className="flex justify-end mb-8">
            <div className="w-72 border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex justify-between px-5 py-3 bg-slate-50 text-sm text-slate-600">
                <span>공급가액</span>
                <span className="font-medium">{supply.toLocaleString()}원</span>
              </div>
              {tm !== 'none' && (
                <div className="flex justify-between px-5 py-3 border-t border-slate-100 text-sm text-violet-600">
                  <span>부가세{tm === 'exc' ? ' (10%)' : ' (포함)'}</span>
                  <span className="font-medium">{taxAmt.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between px-5 py-4 bg-slate-900 text-white font-bold">
                <span>총 합계</span>
                <span className="text-lg">{total.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* 비고 */}
          {quote.note && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-600 font-semibold mb-1">비고</p>
              <p className="text-sm text-slate-700">{quote.note}</p>
            </div>
          )}

          {/* 고객용 PDF 저장 버튼 */}
          {isCustomer && (
            <div className="no-print flex justify-center pt-6 border-t border-slate-100">
              <button
                onClick={handleDownloadPdf}
                className="bg-slate-900 text-white px-10 py-3 rounded-xl text-sm font-semibold hover:bg-slate-700 transition">
                PDF 저장
              </button>
            </div>
          )}

          {/* 하단 버튼 */}
          {!isCustomer && (
            <div className="no-print flex gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={handleDownloadPdf}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition">
                PDF 다운로드
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? '발송 중...' : '이메일 발송'}
              </button>
              <Link
                href={`/sites/${siteId}`}
                className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition text-center">
                뒤로가기
              </Link>
            </div>
          )}

          {/* 발송 이력 */}
          {!isCustomer && (
            <div className="no-print mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">발송 이력</h3>
              {emailLogs.length === 0 ? (
                <p className="text-xs text-slate-400">발송 이력이 없습니다.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">발송 시각</th>
                        <th className="px-4 py-2.5 text-left font-medium">받는 사람</th>
                        <th className="px-4 py-2.5 text-left font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log, i) => (
                        <tr key={log.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-4 py-2.5 text-slate-600">
                            {new Date(log.sentAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {log.recipientName ? `${log.recipientName} (${log.recipientEmail})` : log.recipientEmail}
                          </td>
                          <td className="px-4 py-2.5">
                            {log.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">✅ 성공</span>
                            ) : log.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 text-red-500 font-medium" title={log.errorMessage ?? ''}>❌ 실패</span>
                            ) : (
                              <span className="text-slate-400">대기</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
