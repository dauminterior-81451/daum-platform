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
  unit: string
  supplier: string
  purchaseDate: string
  note: string
  category: string
}

export interface AsItem {
  id: string
  siteId: string
  date: string
  description: string
  status: '접수' | '처리중' | '완료'
  note: string
}

export interface MaterialFile {
  id: string
  siteId: string
  name: string
  url: string
  storagePath: string
  fileType: string
  size: number
  memo: string
  createdAt: string
}

export interface DrawingFile {
  id: string
  siteId: string
  name: string
  url: string
  storagePath: string
  fileType: string
  size: number
  createdAt: string
}

export interface ProcessItem {
  id: string
  siteId: string
  date: string         // 시작일
  endDate?: string     // 종료일 (inclusive)
  content: string
  description?: string // 작업 예정 내용
  photos?: string[]    // 시공 사진 URL 배열
  done: boolean
}

export interface ExtraPayment {
  id: string
  siteId: string
  title: string
  amount: number
  scheduledDate: string
  paid: boolean
  memo: string
}

export interface ClientNotice {
  id: string
  siteId: string
  content: string
  createdAt: string
}

export interface ClientInquiry {
  id: string
  siteId: string
  content: string
  answer?: string | null
  createdAt: string
  answered_at?: string | null
}

export interface SiteExpense {
  id: string
  siteId: string
  type: 'labor' | 'misc' | 'material'
  description: string
  amount: number
  date: string
  memo: string
  category: string
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
  materialFiles: {
    listBySite: async (siteId: string): Promise<MaterialFile[]> => {
      const { data, error } = await supabase
        .from('material_files')
        .select('*')
        .eq('siteId', siteId)
        .order('createdAt', { ascending: false })
      if (error) console.error('[storage:material_files]', error)
      return (data ?? []) as MaterialFile[]
    },
    insert: async (item: MaterialFile): Promise<void> => {
      const { error } = await supabase.from('material_files').insert(item)
      if (error) console.error('[storage:material_files:insert]', error)
    },
    remove: (id: string) => deleteRow('material_files', id),
  },
  drawingFiles: {
    listBySite: async (siteId: string): Promise<DrawingFile[]> => {
      const { data, error } = await supabase
        .from('drawing_files')
        .select('*')
        .eq('siteId', siteId)
        .order('createdAt', { ascending: false })
      if (error) console.error('[storage:drawing_files]', error)
      return (data ?? []) as DrawingFile[]
    },
    insert: async (item: DrawingFile): Promise<void> => {
      const { error } = await supabase.from('drawing_files').insert(item)
      if (error) console.error('[storage:drawing_files:insert]', error)
    },
    remove: (id: string) => deleteRow('drawing_files', id),
  },
  processItems: {
    listBySite: async (siteId: string): Promise<ProcessItem[]> => {
      const { data, error } = await supabase
        .from('process_items')
        .select('*')
        .eq('siteId', siteId)
        .order('date', { ascending: true })
      if (error) console.error('[storage:process_items]', error)
      // DB column is `completed`, TypeScript interface uses `done`
      return (data ?? []).map((row: Record<string, unknown>) => {
        const { completed, ...rest } = row as { completed: boolean } & Record<string, unknown>
        return { ...rest, done: completed }
      }) as ProcessItem[]
    },
    // 신규 공정: id 제외하고 INSERT → DB가 UUID 자동 생성, 생성된 행 반환
    insert: async (item: Omit<ProcessItem, 'id'>): Promise<ProcessItem> => {
      const payload = {
        siteId:      item.siteId,
        content:     item.content,
        date:        item.date,
        endDate:     item.endDate ?? null,
        description: item.description ?? '',
        photos:      item.photos ?? [],
        completed:   item.done,
      }
      const { data, error } = await supabase
        .from('process_items')
        .insert(payload)
        .select()
        .single()
      if (error) {
        console.error('[process_items:insert] FAILED', { message: error.message, code: error.code })
        throw new Error(error.message)
      }
      const { completed, ...rest } = data as { completed: boolean } & Record<string, unknown>
      return { ...rest, done: completed } as ProcessItem
    },
    // 기존 공정 수정: UUID id 포함 UPSERT
    upsert: async (item: ProcessItem): Promise<void> => {
      const payload = {
        id:          item.id,
        siteId:      item.siteId,
        content:     item.content,
        date:        item.date,
        endDate:     item.endDate ?? null,
        description: item.description ?? '',
        photos:      item.photos ?? [],
        completed:   item.done,
      }
      const { error } = await supabase.from('process_items').upsert(payload as never)
      if (error) {
        console.error('[process_items:upsert] FAILED', { message: error.message, code: error.code })
        throw new Error(error.message)
      }
    },
    remove: (id: string) => deleteRow('process_items', id),
  },
  extraPayments: {
    listBySite: async (siteId: string): Promise<ExtraPayment[]> => {
      const { data, error } = await supabase
        .from('extra_payments')
        .select('*')
        .eq('siteId', siteId)
        .order('id', { ascending: true })
      if (error) console.error('[storage:extra_payments]', error)
      return (data ?? []) as ExtraPayment[]
    },
    upsert: (item: ExtraPayment) => upsertRow('extra_payments', item),
    remove: (id: string) => deleteRow('extra_payments', id),
  },
  clientNotices: {
    listBySite: async (siteId: string): Promise<ClientNotice[]> => {
      const { data, error } = await supabase
        .from('client_notices')
        .select('*')
        .eq('siteId', siteId)
        .order('createdAt', { ascending: false })
      if (error) console.error('[storage:client_notices]', error)
      return (data ?? []) as ClientNotice[]
    },
    insert: async (item: Omit<ClientNotice, 'id'>): Promise<ClientNotice> => {
      const { data, error } = await supabase
        .from('client_notices')
        .insert(item)
        .select()
        .single()
      if (error) {
        console.error('[client_notices:insert] FAILED', { message: error.message, code: error.code })
        throw new Error(error.message)
      }
      return data as ClientNotice
    },
    upsert: (item: ClientNotice) => upsertRow('client_notices', item),
    remove: (id: string) => deleteRow('client_notices', id),
  },
  clientInquiries: {
    listBySite: async (siteId: string): Promise<ClientInquiry[]> => {
      const { data, error } = await supabase
        .from('client_inquiries')
        .select('*')
        .eq('siteId', siteId)
        .order('createdAt', { ascending: false })
      if (error) console.error('[storage:client_inquiries]', error)
      return (data ?? []) as ClientInquiry[]
    },
    insert: async (item: Omit<ClientInquiry, 'id'>): Promise<ClientInquiry> => {
      const { data, error } = await supabase
        .from('client_inquiries')
        .insert(item)
        .select()
        .single()
      if (error) {
        console.error('[client_inquiries:insert] FAILED', { message: error.message, code: error.code })
        throw new Error(error.message)
      }
      return data as ClientInquiry
    },
    upsert: async (item: ClientInquiry): Promise<void> => {
      const { error } = await supabase
        .from('client_inquiries')
        .update({ answer: item.answer, answered_at: item.answered_at })
        .eq('id', item.id)
      if (error) {
        console.error('[client_inquiries:upsert] FAILED', { message: error.message, code: error.code })
        throw new Error(error.message)
      }
    },
    remove: (id: string) => deleteRow('client_inquiries', id),
  },
  siteExpenses: {
    list: (): Promise<SiteExpense[]> => select<SiteExpense>('site_expenses'),
    listBySite: async (siteId: string): Promise<SiteExpense[]> => {
      const { data, error } = await supabase
        .from('site_expenses')
        .select('*')
        .eq('siteId', siteId)
        .order('date', { ascending: true })
      if (error) console.error('[storage:site_expenses]', error)
      return (data ?? []) as SiteExpense[]
    },
    upsert: async (item: SiteExpense): Promise<void> => {
      const { error } = await supabase.from('site_expenses').upsert(item as never)
      if (error) {
        console.error('[site_expenses:upsert] FAILED', { message: error.message, code: error.code })
        throw new Error(error.message)
      }
    },
    remove: (id: string) => deleteRow('site_expenses', id),
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
