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

// GET - получить конкретное предложение
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] API GET individual - Looking for proposal ID:", params.id)

    const { id } = params
    const proposal = proposalsStore.find((p) => p.id === id)

    if (proposal) {
      console.log("[v0] API GET individual - Found proposal:", proposal.proposalNumber)
      return NextResponse.json({
        success: true,
        data: proposal,
      })
    }

    console.log("[v0] API GET individual - Proposal not found")
    return NextResponse.json({ success: false, error: "Предложение не найдено" }, { status: 404 })
  } catch (error) {
    console.error("[v0] API GET individual error:", error)
    return NextResponse.json({ success: false, error: "Ошибка получения предложения" }, { status: 500 })
  }
}

// PUT - обновить предложение
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] API PUT - Updating proposal ID:", params.id)

    const { id } = params
    const body = await request.json()

    const proposalIndex = proposalsStore.findIndex((p) => p.id === id)

    if (proposalIndex === -1) {
      return NextResponse.json({ success: false, error: "Предложение не найдено" }, { status: 404 })
    }

    const updatedProposal: Proposal = {
      ...proposalsStore[proposalIndex],
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    }

    proposalsStore[proposalIndex] = updatedProposal

    console.log("[v0] API PUT - Successfully updated proposal")

    return NextResponse.json({
      success: true,
      data: updatedProposal,
    })
  } catch (error) {
    console.error("[v0] API PUT error:", error)
    return NextResponse.json({ success: false, error: "Ошибка обновления предложения" }, { status: 500 })
  }
}

// DELETE - удалить предложение
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] API DELETE - Deleting proposal ID:", params.id)

    const { id } = params
    const proposalIndex = proposalsStore.findIndex((p) => p.id === id)

    if (proposalIndex === -1) {
      console.log("[v0] API DELETE - Proposal not found")
      return NextResponse.json({ success: false, error: "Предложение не найдено" }, { status: 404 })
    }

    proposalsStore.splice(proposalIndex, 1)

    console.log("[v0] API DELETE - Successfully deleted proposal, store now has:", proposalsStore.length, "proposals")

    return NextResponse.json({
      success: true,
      message: "Предложение удалено",
    })
  } catch (error) {
    console.error("[v0] API DELETE error:", error)
    return NextResponse.json({ success: false, error: "Ошибка удаления предложения" }, { status: 500 })
  }
}
