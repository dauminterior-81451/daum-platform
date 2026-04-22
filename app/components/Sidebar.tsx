'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: '대시보드'  },
  { href: '/sites',     label: '현장관리'  },
  { href: '/estimates', label: '견적서'    },
  { href: '/payments',  label: '입금/정산' },
  { href: '/materials', label: '자재관리'  },
  { href: '/as',        label: 'AS관리'   },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-xs text-slate-400 font-medium">업무관리 플랫폼</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">다움인테리어</h1>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {nav.map(({ href, label }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-100 text-xs text-slate-400">
        v1.0.0
      </div>
    </aside>
  )
}
