interface TableRow {
  id: string
  type: "item" | "group"
  name: string
  quantity: number
  unit: string
  price: number
  sum: number
  photo?: string
}

interface Proposal {
  id: string
  proposalNumber: string
  clientName: string
  editableDate: string
  rows: TableRow[]
  notes: string
  createdAt: string
  updatedAt: string
}

// Shared store that both API routes will use
export const proposalsStore: Proposal[] = []

export type { Proposal, TableRow }
