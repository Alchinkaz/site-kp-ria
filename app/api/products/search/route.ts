import { type NextRequest, NextResponse } from "next/server"

interface Product {
  id: string
  name: string
  description?: string
  unit: string
  price: number
  category?: string
  photo?: string
  inStock: boolean
}

// GET - поиск товаров для добавления в предложение
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const category = searchParams.get("category") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    // В будущем здесь будет поиск в базе данных товаров
    const products: Product[] = []

    return NextResponse.json({
      success: true,
      data: {
        products,
        total: products.length,
        query,
        category,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Ошибка поиска товаров" }, { status: 500 })
  }
}
