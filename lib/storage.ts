export interface ProposalData {
  id?: string
  proposalNumber: string
  clientName: string
  proposalDate: string
  notes: string
  rows: any[]
}

class StorageManager {
  async saveProposal(data: ProposalData, proposalName?: string): Promise<string> {
    console.log("[v0] Starting saveProposal with data:", data)

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposalNumber: data.proposalNumber,
          clientName: data.clientName,
          editableDate: data.proposalDate,
          rows: data.rows,
          notes: data.notes,
          proposalName: proposalName || `${data.clientName}_${data.proposalNumber}`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("[v0] Successfully saved proposal with ID:", result.data.id)
        return result.data.id
      } else {
        throw new Error(result.error || "Failed to save proposal")
      }
    } catch (error) {
      console.error("[v0] API save failed:", error)
      throw new Error(`Failed to save proposal: ${error}`)
    }
  }

  async loadProposals(): Promise<ProposalData[]> {
    try {
      const response = await fetch("/api/proposals")
      const result = await response.json()

      if (result.success) {
        return result.data.map((proposal: any) => ({
          id: proposal.id,
          proposalNumber: proposal.proposalNumber,
          clientName: proposal.clientName,
          proposalDate: proposal.editableDate,
          notes: proposal.notes,
          rows: proposal.rows,
        }))
      } else {
        throw new Error(result.error || "Failed to load proposals")
      }
    } catch (error) {
      console.log("[v0] Failed to load proposals from API:", error)
      return []
    }
  }

  async deleteProposal(proposalId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "DELETE",
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error("[v0] Failed to delete proposal:", error)
      return false
    }
  }

  async loadProposalById(proposalId: string): Promise<ProposalData | null> {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`)
      const result = await response.json()

      if (result.success) {
        const proposal = result.data
        return {
          id: proposal.id,
          proposalNumber: proposal.proposalNumber,
          clientName: proposal.clientName,
          proposalDate: proposal.editableDate,
          notes: proposal.notes,
          rows: proposal.rows,
        }
      } else {
        return null
      }
    } catch (error) {
      console.error("[v0] Failed to load proposal by ID:", error)
      return null
    }
  }
}

export const storageManager = new StorageManager()
