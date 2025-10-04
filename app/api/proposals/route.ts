import { type NextRequest, NextResponse } from "next/server"
import { proposalsStore, type Proposal } from "@/lib/proposals-store"

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

export async function GET() {
  try {
    console.log("[v0] API GET - Loading proposals, current store:", proposalsStore.length)

    // Sort by creation date, newest first
    const sortedProposals = [...proposalsStore].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    return NextResponse.json({
      success: true,
      data: sortedProposals,
    })
  } catch (error) {
    console.error("[v0] API GET error:", error)
    return NextResponse.json({ success: false, error: "Ошибка получения предложений" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API POST - Starting proposal save")

    const body = await request.json()
    console.log("[v0] API POST - Received body:", body)

    const { proposalNumber, clientName, editableDate, rows, notes, proposalName } = body

    const id = `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const newProposal: Proposal = {
      id,
      proposalNumber: proposalNumber || `КП-${Date.now()}`,
      clientName: clientName || "",
      editableDate: editableDate || new Date().toISOString().split("T")[0],
      rows: rows || [],
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log("[v0] API POST - Created proposal:", newProposal)

    proposalsStore.push(newProposal)

    console.log("[v0] API POST - Successfully saved, store now has:", proposalsStore.length, "proposals")

    return NextResponse.json({
      success: true,
      data: newProposal,
    })
  } catch (error) {
    console.error("[v0] API POST error:", error)
    return NextResponse.json({ success: false, error: `Ошибка создания предложения: ${error}` }, { status: 500 })
  }
}
