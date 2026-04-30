'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Quote, Settlement, SiteExpense, storage, Site } from '../lib/storage'

function calcQuoteTotal(quotes: Quote[], siteId: string): number {
  const sq = quotes.filter(q => q.siteId === siteId)
  if (sq.length === 0) return 0
  const last = sq.reduce((a, b) => (b.revision ?? 1) >= (a.revision ?? 1) ? b : a)
  const supply = last.items
    .filter(i => i.unit !== '__group__')
    .reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const tm = last.taxMode ?? 'exc'
  return tm === 'exc' ? Math.round(supply * 1.1) : supply
}

function calcSettlementPaid(s: Settlement): number {
  return (['deposit', 'startup', 'interim', 'balance'] as const)
    .filter(k => s[k].paid)
    .reduce((sum, k) => sum + (s[k].amount || 0), 0)
}

export default function DashboardPage() {
  const [data, setData] = useState({
    sites: 0,
    customers: 0,
    activeSites: 0,
    totalPayment: 0,
    unpaid: 0,
    recentSites: [] as Site[],
    totalCost: 0,
    expectedMargin: 0,
    realizedMargin: 0,
    marginRate: null as number | null,
  })

  useEffect(() => {
    Promise.all([
      storage.sites.list(),
      storage.quotes.list(),
      storage.siteExpenses.list(),
    ]).then(async ([sites, quotes, siteExpenses]) => {
      const settled = await Promise.all(
        sites.map(s => storage.settlements.get(s.id))
      )

      let totalPayment = 0
      let totalQuote = 0
      sites.forEach((site, i) => {
        const settlement = settled[i]
        totalQuote   += settlement?.contractTotal ?? calcQuoteTotal(quotes, site.id)
        totalPayment += settlement ? calcSettlementPaid(settlement) : 0
      })

      const recentSites = [...sites]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
      const uniqueCustomers = new Set(sites.map(s => s.customerName).filter(Boolean)).size

      const totalCost      = (siteExpenses as SiteExpense[]).reduce((s, e) => s + e.amount, 0)
      const expectedMargin = totalQuote - totalCost
      const realizedMargin = totalPayment - totalCost
      const marginRate     = totalQuote > 0 ? Math.round((expectedMargin / totalQuote) * 100) : null

      setData({
        sites: sites.length,
        customers: uniqueCustomers,
        activeSites: sites.filter(s => s.status === 'in_progress').length,
        totalPayment,
        unpaid: Math.max(0, totalQuote - totalPayment),
        recentSites,
        totalCost,
        expectedMargin,
        realizedMargin,
        marginRate,
      })
    })
  }, [])

  const cards = [
    { label: '전체 현장',  value: `${data.sites}건`,                        desc: '등록된 현장 수',   href: '/sites' },
    { label: '진행중 현장', value: `${data.activeSites}건`,                  desc: '현재 시공 진행 중', href: '/sites' },
    { label: '고객 수',    value: `${data.customers}명`,                     desc: '등록 고객 수',     href: '/customers' },
    { label: '총 입금액',  value: `${data.totalPayment.toLocaleString()}원`, desc: '누적 입금 합계',   href: '/payments' },
  ]

  const STATUS_STYLE: Record<string, string> = {
    pre_contract: 'bg-slate-100 text-slate-600',
    in_progress:  'bg-blue-100 text-blue-700',
    completed:    'bg-green-100 text-green-700',
  }

  const STATUS_LABEL: Record<string, string> = {
    pre_contract: '계약전',
    in_progress:  '진행중',
    completed:    '완료',
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <h2 className="text-xl font-bold text-slate-800 mb-5">대시보드</h2>

      {/* 통계 카드 — 모바일 2열, 데스크탑 4열 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white rounded-xl border border-slate-200 px-4 py-4 md:px-6 md:py-5 hover:shadow-sm transition-shadow"
          >
            <p className="text-xs text-slate-400 mb-1.5">{c.label}</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">{c.value}</p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* 미수금 현황 카드 */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 md:px-6 md:py-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-red-400 mb-1">미수금 현황</p>
          <p className="text-2xl md:text-3xl font-bold text-red-600">{data.unpaid.toLocaleString()}원</p>
          <p className="text-xs text-red-400 mt-1">총 견적 금액 — 입금액</p>
        </div>
        <Link
          href="/payments"
          className="bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors min-h-[44px] flex items-center"
        >
          입금 관리 →
        </Link>
      </div>

      {/* 마진 현황 — 모바일 1열, sm 이상 3열 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-4">
          <p className="text-xs text-slate-400 mb-1.5">총 지출</p>
          <p className="text-2xl font-bold text-slate-800">{data.totalCost.toLocaleString()}원</p>
          <p className="text-xs text-slate-400 mt-1">자재비 + 인건비 + 기타잡비</p>
        </div>
        <div className={`border rounded-xl px-4 py-4 ${data.expectedMargin >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-slate-400 mb-1.5">예상 마진</p>
          <p className={`text-2xl font-bold ${data.expectedMargin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {data.expectedMargin.toLocaleString()}원
          </p>
          {data.marginRate !== null && (
            <p className="text-xs text-slate-400 mt-1">마진율 {data.marginRate}%</p>
          )}
        </div>
        <div className={`border rounded-xl px-4 py-4 ${data.realizedMargin >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-slate-400 mb-1.5">실현 마진</p>
          <p className={`text-2xl font-bold ${data.realizedMargin >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            {data.realizedMargin.toLocaleString()}원
          </p>
          <p className="text-xs text-slate-400 mt-1">수금액 기준</p>
        </div>
      </div>

      {/* 최근 현장 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">최근 현장</h3>
          <Link href="/sites" className="text-xs text-slate-400 hover:text-slate-700">전체보기 →</Link>
        </div>
        {data.recentSites.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">등록된 현장이 없습니다.</p>
        ) : (
          <>
            {/* 모바일 카드 */}
            <div className="md:hidden divide-y divide-slate-100">
              {data.recentSites.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sites/${s.id}`} className="font-medium text-slate-800 text-sm block truncate">
                      {s.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">{s.startDate || '—'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>
              ))}
            </div>

            {/* 데스크탑 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">현장명</th>
                    <th className="px-5 py-3 font-medium">주소</th>
                    <th className="px-5 py-3 font-medium text-center">상태</th>
                    <th className="px-5 py-3 font-medium text-right">시작일</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSites.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/sites/${s.id}`} className="font-medium text-slate-800 hover:text-slate-600">
                          {s.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500 truncate max-w-[180px]">{s.address || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400 whitespace-nowrap">{s.startDate || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
