'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createAuthClient } from '../lib/supabase'
import { storage } from '../lib/storage'

const nav = [
  { href: '/dashboard',  label: '대시보드'  },
  { href: '/sites',      label: '현장관리'  },
  { href: '/estimates',  label: '견적서'    },
  { href: '/payments',   label: '입금/정산' },
  { href: '/materials',  label: '자재관리'  },
  { href: '/as',         label: 'AS관리'   },
  { href: '/email-logs', label: '발송 이력' },
  { href: '/settings',   label: '설정'      },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [email, setEmail]           = useState<string | null>(null)
  const [isOpen, setIsOpen]         = useState(false)
  const [companyName, setCompanyName] = useState('다움인테리어')
  const [logoUrl, setLogoUrl]       = useState<string>('')

  useEffect(() => {
    const auth = createAuthClient()
    auth.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null)
    })
  }, [])

  useEffect(() => {
    storage.companySettings.get().then(s => {
      if (s?.name) setCompanyName(s.name)
      if (s?.logoUrl) setLogoUrl(s.logoUrl)
    })
  }, [])

  // 설정 저장 시 즉시 반영
  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.name)    setCompanyName(detail.name)
      if (detail?.logoUrl !== undefined) setLogoUrl(detail.logoUrl ?? '')
    }
    window.addEventListener('companySettingsUpdated', onUpdate)
    return () => window.removeEventListener('companySettingsUpdated', onUpdate)
  }, [])

  useEffect(() => { setIsOpen(false) }, [pathname])

  async function handleLogout() {
    const auth = createAuthClient()
    await auth.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const header = (
    <div className="flex items-center gap-3 min-w-0">
      {logoUrl ? (
        <img src={logoUrl} alt="로고" className="w-8 h-8 rounded-lg object-contain shrink-0 border border-slate-100" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 text-sm font-bold">
          {companyName.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium leading-none mb-0.5">업무관리 플랫폼</p>
        <h1 className="text-sm font-bold text-slate-800 truncate">{companyName}</h1>
      </div>
    </div>
  )

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

      {/* 모바일 전체화면 오버레이 */}
      <div
        className={[
          'md:hidden fixed inset-0 z-50 bg-white flex flex-col',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          {header}
          <button
            onClick={() => setIsOpen(false)}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-2 shrink-0"
            aria-label="메뉴 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16"/>
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {nav.map(({ href, label }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link key={label} href={href}
                className={[
                  'flex items-center px-4 py-4 rounded-xl text-base font-medium transition-colors',
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-5 border-t border-slate-100 shrink-0">
          {email && <p className="text-xs text-slate-400 truncate px-1 mb-3">{email}</p>}
          <button onClick={handleLogout}
            className="w-full text-left text-slate-600 hover:text-slate-900 px-4 py-4 rounded-xl hover:bg-slate-50 transition text-base font-medium">
            로그아웃
          </button>
        </div>
      </div>

      {/* 데스크탑 사이드바 */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          {header}
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label }) => {
            const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
            return (
              <Link key={label} href={href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}>
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          {email && <p className="text-xs text-slate-400 truncate px-1 mb-2">{email}</p>}
          <button onClick={handleLogout}
            className="w-full text-left text-xs text-slate-500 hover:text-slate-800 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition">
            로그아웃
          </button>
          <p className="text-xs text-slate-400 px-3 mt-2">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
