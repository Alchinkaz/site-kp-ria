import { supabase } from "./supabase"

interface TableRow {
  id: string
  type: "item" | "group"
  name: string
  quantity: number
  unit: string
  price: number
  sum: number
}

export interface SavedProposalData {
  rows: TableRow[]
  clientName: string
  notes: string
  proposalNumber: string
  editableDate?: string
}

export interface Proposal {
  id: string
  proposal_number: string
  proposal_name: string
  client_name: string
  proposal_date: string
  notes?: string
  total_amount: number
  created_at: string
  updated_at: string
}

export interface ProposalItem {
  id: string
  proposal_id: string
  item_order: number
  item_type: "item" | "group"
  name: string
  quantity: number
  unit: string
  price: number
  sum: number
  created_at: string
}

export interface ProposalWithItems extends Proposal {
  proposal_items: ProposalItem[]
}

export class ProposalService {
  // Сохранение предложения в Supabase
  static async saveProposal(proposalName: string, proposalData: SavedProposalData): Promise<string | null> {
    try {
      console.log("Attempting to save proposal to Supabase...", {
        proposalName,
        proposalNumber: proposalData.proposalNumber,
        clientName: proposalData.clientName,
      })

      const totalAmount = proposalData.rows
        .filter((row) => row.type === "item")
        .reduce((total, row) => total + row.sum, 0)

      // Сначала сохраняем основную информацию о предложении
      const { data: proposal, error: proposalError } = await supabase
        .from("proposals")
        .insert({
          proposal_number: proposalData.proposalNumber,
          proposal_name: proposalName,
          client_name: proposalData.clientName,
          proposal_date: proposalData.editableDate
            ? new Date(proposalData.editableDate.split(".").reverse().join("-")).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          notes: proposalData.notes,
          total_amount: totalAmount,
        })
        .select()
        .single()

      if (proposalError) {
        console.error("Error saving proposal:", proposalError)
        alert(`Ошибка при сохранении предложения: ${proposalError.message}`)
        return null
      }

      console.log("Proposal saved successfully:", proposal)

      // Затем сохраняем позиции предложения
      const proposalItems = proposalData.rows.map((row, index) => ({
        proposal_id: proposal.id,
        item_order: index,
        item_type: row.type,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        price: row.price,
        sum: row.sum,
      }))

      console.log("Saving proposal items:", proposalItems)

      const { error: itemsError } = await supabase.from("proposal_items").insert(proposalItems)

      if (itemsError) {
        console.error("Error saving proposal items:", itemsError)
        // Удаляем предложение, если не удалось сохранить позиции
        await supabase.from("proposals").delete().eq("id", proposal.id)
        alert(`Ошибка при сохранении позиций предложения: ${itemsError.message}`)
        return null
      }

      console.log("Proposal items saved successfully")
      return proposal.id
    } catch (error) {
      console.error("Error in saveProposal:", error)
      alert(`Неожиданная ошибка при сохранении предложения: ${error}`)
      return null
    }
  }

  // Получение всех предложений
  static async getAllProposals(): Promise<Proposal[]> {
    try {
      const { data, error } = await supabase.from("proposals").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching proposals:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error in getAllProposals:", error)
      return []
    }
  }

  // Получение предложения по ID с позициями
  static async getProposalById(id: string): Promise<ProposalWithItems | null> {
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          *,
          proposal_items (*)
        `)
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error fetching proposal:", error)
        return null
      }

      // Сортируем позиции по порядку
      if (data.proposal_items) {
        data.proposal_items.sort((a: ProposalItem, b: ProposalItem) => a.item_order - b.item_order)
      }

      return data as ProposalWithItems
    } catch (error) {
      console.error("Error in getProposalById:", error)
      return null
    }
  }

  // Удаление предложения
  static async deleteProposal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("proposals").delete().eq("id", id)

      if (error) {
        console.error("Error deleting proposal:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in deleteProposal:", error)
      return false
    }
  }

  // Проверка существования имени предложения
  static async checkProposalNameExists(proposalName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("proposals").select("id").eq("proposal_name", proposalName).single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error checking proposal name:", error)
        return false
      }

      return !!data
    } catch (error) {
      console.error("Error in checkProposalNameExists:", error)
      return false
    }
  }

  // Конвертация данных Supabase в формат приложения
  static convertToAppFormat(proposalWithItems: ProposalWithItems): SavedProposalData {
    return {
      rows: proposalWithItems.proposal_items.map((item) => ({
        id: item.id,
        type: item.item_type,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        sum: item.sum,
      })),
      clientName: proposalWithItems.client_name,
      notes: proposalWithItems.notes || "",
      proposalNumber: proposalWithItems.proposal_number,
      editableDate: new Date(proposalWithItems.proposal_date).toLocaleDateString("ru-RU"),
    }
  }
}
