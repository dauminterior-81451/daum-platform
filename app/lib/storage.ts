import { supabase } from './supabase'

export type SiteStatus = 'pre_contract' | 'in_progress' | 'completed'

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  pre_contract: '계약전',
  in_progress:  '진행중',
  completed:    '완료',
}

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
  ratio: number
  scheduledDate: string
  paidDate: string
  paid: boolean
}

export interface Settlement {
  siteId: string
  contractTotal: number
  deposit: StagePayment
  startup: StagePayment
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

export interface EmailLog {
  id: string
  siteId: string | null
  estimateId: string | null
  recipientEmail: string
  recipientName: string | null
  subject: string
  sendType: 'estimate' | 'contract' | 'other'
  status: 'success' | 'failed' | 'pending'
  errorMessage: string | null
  sentAt: string
}

// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────────
async function select<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) console.error(`[storage:${table}:select]`, error)
  return (data ?? []) as T[]
}

async function upsertRow(table: string, item: object): Promise<void> {
  const { error } = await supabase.from(table).upsert(item as never)
  if (error) console.error(`[storage:${table}:upsert]`, error)
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) console.error(`[storage:${table}:delete]`, error)
}

// ── storage ────────────────────────────────────────────────────────────────────
export const storage = {
  customers: {
    list:   (): Promise<Customer[]>   => select<Customer>('customers'),
    upsert: (item: Customer)          => upsertRow('customers', item),
    remove: (id: string)              => deleteRow('customers', id),
  },
  sites: {
    list:   (): Promise<Site[]>       => select<Site>('sites'),
    upsert: (item: Site)              => upsertRow('sites', item),
    remove: (id: string)              => deleteRow('sites', id),
  },
  quotes: {
    list:   (): Promise<Quote[]>      => select<Quote>('quotes'),
    upsert: (item: Quote)             => upsertRow('quotes', item),
    remove: (id: string)              => deleteRow('quotes', id),
  },
  payments: {
    list:   (): Promise<Payment[]>    => select<Payment>('payments'),
    upsert: (item: Payment)           => upsertRow('payments', item),
    remove: (id: string)              => deleteRow('payments', id),
  },
  materials: {
    list:   (): Promise<Material[]>   => select<Material>('materials'),
    upsert: (item: Material)          => upsertRow('materials', item),
    remove: (id: string)              => deleteRow('materials', id),
  },
  asItems: {
    list:   (): Promise<AsItem[]>     => select<AsItem>('as_items'),
    upsert: (item: AsItem)            => upsertRow('as_items', item),
    remove: (id: string)              => deleteRow('as_items', id),
  },
  settlements: {
    get: async (siteId: string): Promise<Settlement | null> => {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('siteId', siteId)
        .maybeSingle()
      if (error) console.error('[storage:settlements:get]', error)
      return (data ?? null) as Settlement | null
    },
    save: (siteId: string, data: Settlement): Promise<void> =>
      upsertRow('settlements', { ...data, siteId }),
  },
  emailLogs: {
    list: async (): Promise<EmailLog[]> => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sentAt', { ascending: false })
      if (error) console.error('[storage:email_logs:list]', error)
      return (data ?? []) as EmailLog[]
    },
    listByEstimate: async (estimateId: string): Promise<EmailLog[]> => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('estimateId', estimateId)
        .order('sentAt', { ascending: false })
      if (error) console.error('[storage:email_logs:listByEstimate]', error)
      return (data ?? []) as EmailLog[]
    },
    insert: async (log: Omit<EmailLog, 'id' | 'sentAt'>): Promise<void> => {
      const { error } = await supabase.from('email_logs').insert(log)
      if (error) console.error('[storage:email_logs:insert]', error)
    },
  },
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
