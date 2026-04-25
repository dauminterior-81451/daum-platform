'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function ConditionalSidebar() {
  const pathname = usePathname()
  if (pathname === '/login') return null
  if (/^\/client(\/|$)/.test(pathname)) return null
  return <Sidebar />
}
