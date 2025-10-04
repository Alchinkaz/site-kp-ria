import { createClient } from "@/lib/supabase/client"

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

interface TableRow {
  id: string
  type: "item" | "group"
  name: string
  quantity: number
  unit: string
  price: number
  sum: number
}

interface InvoiceData {
  rows: TableRow[]
  clientName: string
  proposalNumber: string
  notes: string
}

export class InvoiceService {
  // Сохранение счета в Supabase
  static async saveInvoice(
    invoiceNumber: string,
    invoiceDate: string,
    invoiceData: InvoiceData,
    totalAmount: number,
  ): Promise<string | null> {
    try {
      console.log("Attempting to save invoice to Supabase...", {
        invoiceNumber,
        invoiceDate,
        clientName: invoiceData.clientName,
        totalAmount,
      })

      const supabase = createClient()

      // Сначала сохраняем основную информацию о счете
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          client_name: invoiceData.clientName,
          proposal_number: invoiceData.proposalNumber,
          notes: invoiceData.notes,
          total_amount: totalAmount,
        })
        .select()
        .single()

      if (invoiceError) {
        console.error("Error saving invoice:", invoiceError)
        alert(`Ошибка при сохранении счета: ${invoiceError.message}`)
        return null
      }

      console.log("Invoice saved successfully:", invoice)

      // Затем сохраняем позиции счета
      const invoiceItems = invoiceData.rows.map((row, index) => ({
        invoice_id: invoice.id,
        item_order: index,
        item_type: row.type,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        price: row.price,
        sum: row.sum,
      }))

      console.log("Saving invoice items:", invoiceItems)

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

      if (itemsError) {
        console.error("Error saving invoice items:", itemsError)
        // Удаляем счет, если не удалось сохранить позиции
        await supabase.from("invoices").delete().eq("id", invoice.id)
        alert(`Ошибка при сохранении позиций счета: ${itemsError.message}`)
        return null
      }

      console.log("Invoice items saved successfully")
      return invoice.id
    } catch (error) {
      console.error("Error in saveInvoice:", error)
      alert(`Неожиданная ошибка при сохранении счета: ${error}`)
      return null
    }
  }

  // Получение всех счетов
  static async getAllInvoices(): Promise<Invoice[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching invoices:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error in getAllInvoices:", error)
      return []
    }
  }

  // Получение счета по ID с позициями
  static async getInvoiceById(id: string): Promise<InvoiceWithItems | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*)
        `)
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error fetching invoice:", error)
        return null
      }

      // Сортируем позиции по порядку
      if (data.invoice_items) {
        data.invoice_items.sort((a: InvoiceItem, b: InvoiceItem) => a.item_order - b.item_order)
      }

      return data as InvoiceWithItems
    } catch (error) {
      console.error("Error in getInvoiceById:", error)
      return null
    }
  }

  // Удаление счета
  static async deleteInvoice(id: string): Promise<boolean> {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("invoices").delete().eq("id", id)

      if (error) {
        console.error("Error deleting invoice:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in deleteInvoice:", error)
      return false
    }
  }

  // Проверка существования номера счета
  static async checkInvoiceNumberExists(invoiceNumber: string): Promise<boolean> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("invoices").select("id").eq("invoice_number", invoiceNumber).single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking invoice number:", error)
        return false
      }

      return !!data
    } catch (error) {
      console.error("Error in checkInvoiceNumberExists:", error)
      return false
    }
  }

  // Получение следующего номера счета
  static async getNextInvoiceNumber(): Promise<string> {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const day = now.getDate().toString().padStart(2, "0")
    const todayDate = `${year}${month}${day}`

    try {
      const supabase = createClient()
      // Получаем все счета за сегодня
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .like("invoice_number", `СЧ-${todayDate}-%`)
        .order("invoice_number", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error getting last invoice number:", error)
        return `СЧ-${todayDate}-001`
      }

      if (!data || data.length === 0) {
        return `СЧ-${todayDate}-001`
      }

      // Извлекаем последний номер и увеличиваем на 1
      const lastNumber = data[0].invoice_number
      const match = lastNumber.match(/СЧ-\d{6}-(\d{3})/)
      if (match) {
        const nextSequence = Number.parseInt(match[1]) + 1
        return `СЧ-${todayDate}-${String(nextSequence).padStart(3, "0")}`
      }

      return `СЧ-${todayDate}-001`
    } catch (error) {
      console.error("Error in getNextInvoiceNumber:", error)
      return `СЧ-${todayDate}-001`
    }
  }
}
