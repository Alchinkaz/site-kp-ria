import { type NextRequest, NextResponse } from "next/server"

interface Product {
  name: string
  quantity: number
  unit: string
  price: number
  photo?: string
}

// POST - добавить товары в предложение
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { products }: { products: Product[] } = body

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ success: false, error: "Неверный формат данных товаров" }, { status: 400 })
    }

    // Преобразуем товары в формат TableRow
    const newRows = products.map((product) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: "item" as const,
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      price: product.price,
      sum: product.quantity * product.price,
      photo: product.photo,
    }))

    // В будущем здесь будет:
    // 1. Получение текущего предложения из базы данных
    // 2. Добавление новых товаров к существующим
    // 3. Сохранение обновленного предложения

    return NextResponse.json({
      success: true,
      data: {
        message: `Добавлено ${newRows.length} товаров в предложение`,
        addedProducts: newRows,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Ошибка добавления товаров" }, { status: 500 })
  }
}
