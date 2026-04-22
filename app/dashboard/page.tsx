'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { storage, Site } from '../lib/storage'

export default function DashboardPage() {
  const [data, setData] = useState({
    sites: 0,
    customers: 0,
    activeSites: 0,
    totalPayment: 0,
    unpaid: 0,
    recentSites: [] as Site[],
  })

  useEffect(() => {
    Promise.all([
      storage.sites.list(),
      storage.payments.list(),
      storage.quotes.list(),
    ]).then(([sites, payments, quotes]) => {
      const totalPayment = payments.reduce((s, p) => s + p.amount, 0)
      const totalQuote   = quotes.reduce(
        (s, q) => s + q.items.reduce((a, i) => a + i.qty * i.unitPrice, 0),
        0
      )
      const recentSites = [...sites]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
      const uniqueCustomers = new Set(sites.map(s => s.customerName).filter(Boolean)).size

      setData({
        sites: sites.length,
        customers: uniqueCustomers,
        activeSites: sites.filter(s => s.status === '진행중').length,
        totalPayment,
        unpaid: Math.max(0, totalQuote - totalPayment),
        recentSites,
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
    '진행중': 'bg-blue-100 text-blue-700',
    '완료':   'bg-green-100 text-green-700',
    '보류':   'bg-slate-100 text-slate-500',
  }

  return (
    <div className="p-6 max-w-5xl">
      <h2 className="text-xl font-bold text-slate-800 mb-6">대시보드</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white rounded-xl border border-slate-200 px-6 py-5 hover:shadow-sm transition-shadow"
          >
            <p className="text-xs text-slate-400 mb-2">{c.label}</p>
            <p className="text-3xl font-bold text-slate-800 mb-1">{c.value}</p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>

      {/* 미수금 현황 카드 */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-red-400 mb-1">미수금 현황</p>
          <p className="text-3xl font-bold text-red-600">{data.unpaid.toLocaleString()}원</p>
          <p className="text-xs text-red-400 mt-1">총 견적 금액 — 입금액</p>
        </div>
        <Link
          href="/payments"
          className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          입금 관리 →
        </Link>
      </div>

      {/* 최근 현장 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-sm">최근 현장</h3>
          <Link href="/sites" className="text-xs text-slate-400 hover:text-slate-700">전체보기 →</Link>
        </div>
        {data.recentSites.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">등록된 현장이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
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
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-400">{s.startDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
