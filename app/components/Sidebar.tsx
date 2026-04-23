'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createAuthClient } from '../lib/supabase'

const nav = [
  { href: '/dashboard',   label: '대시보드'  },
  { href: '/sites',       label: '현장관리'  },
  { href: '/estimates',   label: '견적서'    },
  { href: '/payments',    label: '입금/정산' },
  { href: '/materials',   label: '자재관리'  },
  { href: '/as',          label: 'AS관리'   },
  { href: '/email-logs',  label: '발송 이력' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [email, setEmail]   = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const auth = createAuthClient()
    auth.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    })
  }, [])

  // 메뉴 선택 시 자동으로 닫힘
  useEffect(() => { setIsOpen(false) }, [pathname])

  async function handleLogout() {
    const auth = createAuthClient()
    await auth.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-[60] p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600"
        aria-label="메뉴 열기"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 4h14M2 9h14M2 14h14"/>
        </svg>
      </button>

      {/* 백드롭 */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50',
          'md:relative md:inset-auto md:z-auto md:translate-x-0',
          'w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">업무관리 플랫폼</p>
            <h1 className="text-base font-bold text-slate-800 mt-0.5">다움인테리어</h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            aria-label="메뉴 닫기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          {email && (
            <p className="text-xs text-slate-400 truncate px-1 mb-2" title={email}>{email}</p>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-slate-500 hover:text-slate-800 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition"
          >
            로그아웃
          </button>
          <p className="text-xs text-slate-400 px-3 mt-2">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
