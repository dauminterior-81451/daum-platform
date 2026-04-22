export type SiteStatus = '진행중' | '완료' | '보류'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  memo: string
  createdAt: string
}

export interface Site {
  id: string
  name: string
  customerId: string
  address: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  startDate: string
  status: SiteStatus
  memo: string
  createdAt: string
}

export interface QuoteItem {
  name: string
  desc?: string
  qty: number
  unit: string
  unitPrice: number
}

export interface Quote {
  id: string
  siteId: string
  date: string
  items: QuoteItem[]
  note: string
  taxMode?: 'exc' | 'inc' | 'none'
  revision?: number
  createdAt?: string
  updatedAt?: string
}

export interface Payment {
  id: string
  siteId: string
  date: string
  amount: number
  type: '입금' | '정산'
  note: string
}

export interface StagePayment {
  amount: number
  scheduledDate: string
  paidDate: string
  paid: boolean
}

export interface Settlement {
  siteId: string
  contractTotal: number
  deposit: StagePayment
  interim: StagePayment
  balance: StagePayment
}

export interface Material {
  id: string
  siteId: string
  name: string
  spec: string
  qty: number
  unit: string
  unitPrice: number
  supplier: string
  purchaseDate: string
  note: string
}

export interface AsItem {
  id: string
  siteId: string
  date: string
  description: string
  status: '접수' | '처리중' | '완료'
  note: string
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, data: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

export const storage = {
  customers: {
    list: () => load<Customer[]>('customers', []),
    save: (data: Customer[]) => save('customers', data),
  },
  sites: {
    list: () => load<Site[]>('sites', []),
    save: (data: Site[]) => save('sites', data),
  },
  quotes: {
    list: () => load<Quote[]>('quotes', []),
    save: (data: Quote[]) => save('quotes', data),
  },
  payments: {
    list: () => load<Payment[]>('payments', []),
    save: (data: Payment[]) => save('payments', data),
  },
  materials: {
    list: () => load<Material[]>('materials', []),
    save: (data: Material[]) => save('materials', data),
  },
  asItems: {
    list: () => load<AsItem[]>('asItems', []),
    save: (data: AsItem[]) => save('asItems', data),
  },
  settlements: {
    get: (siteId: string): Settlement | null =>
      load<Record<string, Settlement>>('settlements', {})[siteId] ?? null,
    save: (siteId: string, data: Settlement) => {
      const all = load<Record<string, Settlement>>('settlements', {})
      save('settlements', { ...all, [siteId]: data })
    },
  },
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
