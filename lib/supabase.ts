import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript interfaces
export interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  client_name: string
  proposal_number?: string
  notes?: string
  total_amount: number
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  item_order: number
  item_type: "item" | "group"
  name: string
  quantity: number
  unit: string
  price: number
  sum: number
  created_at: string
}

export interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[]
}
