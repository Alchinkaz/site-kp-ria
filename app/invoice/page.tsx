"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { numberToWordsKZ } from "@/lib/number-to-words-kz"
import { InvoiceService } from "@/lib/invoice-service"
import { Save } from "lucide-react"
import { supabase } from "@/lib/supabase"

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

// Фиксированные позиции для печати и подписи
const fixedStampPosition = { x: -20, y: 10 }
const fixedSignaturePosition = { x: 0, y: 40 }

export default function InvoicePage() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  // Function to generate a new invoice number
  const generateInvoiceNumber = async () => {
    return await InvoiceService.getNextInvoiceNumber()
  }

  useEffect(() => {
    const loadData = async () => {
      const storedData = localStorage.getItem("v0_current_proposal_for_invoice")
      if (storedData) {
        const parsedData: InvoiceData = JSON.parse(storedData)
        setInvoiceData(parsedData)

        const newInvoiceNumber = await generateInvoiceNumber()
        setInvoiceNumber(newInvoiceNumber)

        const now = new Date()
        setInvoiceDate(now.toLocaleDateString("ru-RU"))
      } else {
        router.push("/")
      }
    }

    loadData()
  }, [router])

  const calculateTotal = () => {
    return invoiceData?.rows.filter((row) => row.type === "item").reduce((total, row) => total + row.sum, 0) || 0
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("ru-RU")
  }

  const saveInvoiceToSupabase = async () => {
    if (!invoiceData) {
      alert("Нет данных для сохранения")
      return
    }

    setIsSaving(true)
    try {
      console.log("Starting invoice save process...")
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("Invoice data:", invoiceData)

      const totalSum = calculateTotal()
      console.log("Total sum:", totalSum)

      // Проверяем подключение к Supabase
      console.log("Testing Supabase connection...")
      const { data: testData, error: testError } = await supabase.from("invoices").select("count").limit(1)

      if (testError) {
        console.error("Supabase connection test failed:", testError)
        alert(
          `Ошибка подключения к базе данных: ${testError.message}\nКод: ${testError.code}\nДетали: ${testError.details}`,
        )
        return
      }

      console.log("Supabase connection test passed:", testData)

      // Сохраняем счет
      console.log("Calling InvoiceService.saveInvoice...")
      const invoiceId = await InvoiceService.saveInvoice(invoiceNumber, invoiceDate, invoiceData, totalSum)

      if (invoiceId) {
        alert("Счет успешно сохранен в базе данных!")
        console.log("Invoice saved with ID:", invoiceId)
      } else {
        console.error("InvoiceService.saveInvoice returned null")
        alert("Ошибка при сохранении счета в базе данных.")
      }
    } catch (error) {
      console.error("Error in saveInvoiceToSupabase:", error)
      alert(`Ошибка при сохранении: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  const testSupabaseConnection = async () => {
    try {
      console.log("Testing Supabase connection...")
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("Supabase Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      const { data, error } = await supabase.from("invoices").select("count").limit(1)

      if (error) {
        console.error("Supabase connection failed:", error)
        alert(
          `Ошибка подключения: ${error.message}\nКод: ${error.code}\nДетали: ${error.details || "Нет дополнительных деталей"}`,
        )
      } else {
        console.log("Supabase connection successful:", data)
        alert("Подключение к Supabase успешно!")
      }
    } catch (error) {
      console.error("Connection test error:", error)
      alert(`Ошибка тестирования подключения: ${error}`)
    }
  }

  const testTableExists = async () => {
    try {
      console.log("Testing if tables exist...")

      // Проверяем таблицу invoices
      const { data: invoicesData, error: invoicesError } = await supabase.from("invoices").select("*").limit(1)

      if (invoicesError) {
        console.error("Invoices table error:", invoicesError)
        alert(`Таблица invoices не найдена: ${invoicesError.message}`)
        return
      }

      // Проверяем таблицу invoice_items
      const { data: itemsData, error: itemsError } = await supabase.from("invoice_items").select("*").limit(1)

      if (itemsError) {
        console.error("Invoice_items table error:", itemsError)
        alert(`Таблица invoice_items не найдена: ${itemsError.message}`)
        return
      }

      console.log("Both tables exist")
      alert("Обе таблицы существуют и доступны!")
    } catch (error) {
      console.error("Table test error:", error)
      alert(`Ошибка проверки таблиц: ${error}`)
    }
  }

  if (!invoiceData) {
    return <div className="flex justify-center items-center min-h-screen">Загрузка счета...</div>
  }

  const totalSum = calculateTotal()
  const totalSumInWords = numberToWordsKZ(totalSum)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-none mx-auto p-4 sm:p-6 md:p-8 print:p-2 print:m-0">
        {/* Header */}
        <header className="border-b-4 border-black pb-4 sm:pb-6 md:pb-8 mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center print:mb-6 gap-4 sm:gap-0">
          <div className="w-full sm:w-2/5 text-xs sm:text-sm leading-relaxed order-1">
            <strong>Компания Alchin</strong>
            <br />
            БИН: 960821350108
            <br />
            Адрес: РК, г. Актау, 11 мкр., 27 дом
            <br />
            IBAN: KZ9496511F0008314291KZT
            <br />
            Банк: АО "ForteBank", г. Актау
            <br />
          </div>
          <div className="w-full sm:w-1/5 text-center order-2">
            <img
              src="/images/Logo.png"
              alt="Логотип компании Alchin"
              className="max-h-20 sm:max-h-24 md:max-h-32 h-auto inline-block"
            />
          </div>
          <div className="w-full sm:w-2/5 text-left sm:text-right text-xs sm:text-sm leading-relaxed pr-0 sm:pr-3 order-3">
            Тел.: +7 771 079 7970
            <br />
            E-mail: info@alchin.kz
            <br />
            Сайт: alchin.kz
            <br />
            Instagram: @alchin.kz
          </div>
        </header>

        {/* Invoice Title and Details */}
        <h1 className="text-center text-lg sm:text-xl md:text-2xl font-bold mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8">
          СЧЕТ НА ОПЛАТУ
        </h1>

        <div className="mb-4 sm:mb-6 text-sm">
          <p className="mb-2">
            <strong>Счет:</strong> {invoiceNumber}
          </p>
          <p className="mb-2">
            <strong>Дата:</strong> {invoiceDate}
          </p>
          <p className="mb-2">
            <strong>Основание:</strong> Коммерческое предложение № {invoiceData.proposalNumber}
          </p>
          <p className="mb-2">
            <strong>Плательщик:</strong> {invoiceData.clientName}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full px-4 sm:px-0">
            <table className="w-full border-collapse mt-5 text-xs sm:text-sm">
              <colgroup>
                <col className="w-[8%] sm:w-[7%]" />
                <col className="w-[35%] sm:w-[40%]" />
                <col className="w-[12%] sm:w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[18%] sm:w-[15%]" />
                <col className="w-[18%] sm:w-[15%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">№</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Наименование</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Кол-во</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Ед.</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Цена, ₸</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Сумма, ₸</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.rows
                  .filter((row) => row.type === "item")
                  .map((row, index) => (
                    <tr key={row.id}>
                      <td className="border border-gray-300 p-1 text-center text-xs">{index + 1}</td>
                      <td className="border border-gray-300 p-1 text-left text-xs">{row.name}</td>
                      <td className="border border-gray-300 p-1 text-center text-xs">{row.quantity}</td>
                      <td className="border border-gray-300 p-1 text-center text-xs">{row.unit}</td>
                      <td className="border border-gray-300 p-1 text-right text-xs">{formatNumber(row.price)}</td>
                      <td className="border border-gray-300 p-1 text-right font-medium text-xs">
                        {formatNumber(row.sum)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={5}
                    className="border border-gray-300 p-1 sm:p-2 font-bold text-center text-xs sm:text-base"
                  >
                    ИТОГО:
                  </td>
                  <td className="border border-gray-300 p-1 sm:p-2 font-bold text-right text-sm sm:text-lg">
                    {formatNumber(totalSum)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Total in words */}
        <div className="mt-4 text-sm">
          <p>
            Всего наименований {invoiceData.rows.filter((row) => row.type === "item").length}, на сумму{" "}
            <strong>{formatNumber(totalSum)} ₸</strong>
          </p>
          <p className="font-bold">Сумма прописью: {totalSumInWords}</p>
        </div>

        {/* Signatures and Bank Details */}
        <div className="mt-8 sm:mt-12 md:mt-16 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 min-h-40 sm:min-h-60">
          <div className="w-full lg:w-80 relative flex flex-col gap-4 sm:gap-5 min-h-40 sm:min-h-60">
            <div className="signature-text">
              <div className="relative z-0 text-xs sm:text-sm leading-relaxed">
                С уважением,
                <br />
                <br />
                Директор Компания «Alchin»
                <br />
                <br />
                <br />
                <div className="border-t border-black w-24 sm:w-32 mb-1"></div>
                <div>Цуриев Ч.Д</div>
              </div>
            </div>
            {/* Stamp (larger, fixed position) */}
            <div
              className="absolute w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60 opacity-100 print:opacity-60"
              style={{ left: `${fixedStampPosition.x * 0.4}px`, top: `${fixedStampPosition.y * 0.8}px` }}
            >
              <img src="/images/stamp.png" alt="Печать" className="w-full h-full object-contain" />
            </div>
            {/* Signature (smaller, fixed position) */}
            <div
              className="absolute w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 opacity-100 print:opacity-60"
              style={{ left: `${fixedSignaturePosition.x * 0.4}px`, top: `${fixedSignaturePosition.y * 0.8}px` }}
            >
              <img src="/images/signature.png" alt="Подпись" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="flex-1 flex flex-col text-xs sm:text-sm leading-relaxed">
            <h3 className="mt-0 mb-3 font-bold">Банковские реквизиты:</h3>
            <p>
              <strong>Компания Alchin</strong>
              <br />
              БИН: 960821350108
              <br />
              Адрес: РК, г. Актау, 11 мкр., 27 дом
              <br />
              IBAN: KZ9496511F0008314291KZT
              <br />
              Банк: АО "ForteBank", г. Актау
            </p>
            {invoiceData.notes && (
              <>
                <h3 className="mt-4 mb-3 font-bold">Примечания:</h3>
                <p>{invoiceData.notes}</p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-2 print:hidden">
          <div className="flex justify-center gap-2 flex-wrap">
            <Button onClick={() => router.push("/")} className="bg-gray-500 hover:bg-gray-600 text-sm">
              Вернуться к КП
            </Button>
            <Button onClick={() => window.print()} className="bg-gray-600 hover:bg-gray-700 text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 001 1v4a1 1 0 001 1zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Печать счета
            </Button>
            <Button
              onClick={saveInvoiceToSupabase}
              className="bg-green-600 hover:bg-green-700 text-sm"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Сохранение..." : "Сохранить счет"}
            </Button>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Button onClick={testSupabaseConnection} className="bg-blue-600 hover:bg-blue-700 text-sm">
              🔗 Тест подключения
            </Button>
            <Button onClick={testTableExists} className="bg-purple-600 hover:bg-purple-700 text-sm">
              📋 Проверить таблицы
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
      html {
        font-size: 12pt;
      }

      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          margin: 0.5cm 1cm 1cm 1cm !important;
          font-size: 12pt !important;
          line-height: 1.2 !important;
        }

        .print\\:hidden {
          display: none !important;
        }

        .print\\:block {
          display: block !important;
        }

        .print\\:border-none {
          border: none !important;
        }

        .print\\:bg-transparent {
          background: transparent !important;
        }

        .print\\:bg-gray-100 {
          background: #f0f0f0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .print\\:font-normal {
          font-weight: normal !important;
        }

        .print\\:resize-none {
          resize: none !important;
        }

        .print\\:p-2 {
          padding: 0.5rem !important;
        }

        .print\\:m-0 {
          margin: 0 !important;
        }

        .print\\:mb-6 {
          margin-bottom: 1.5rem !important;
        }

        .print\\:opacity-60 {
          opacity: 0.6 !important;
        }

        header {
          margin-bottom: 20px !important;
          padding-bottom: 20px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          flex-direction: row !important;
          width: 100% !important;
          border-bottom-width: 4px !important;
          border-bottom-style: solid !important;
          border-bottom-color: black !important;
          position: relative !important;
        }

        header > div:first-child {
          width: 40% !important;
          text-align: left !important;
          font-size: 11pt !important;
          line-height: 1.3 !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
          flex-shrink: 0 !important;
        }

        header > div:nth-child(2) {
          width: 20% !important;
          text-align: center !important;
          order: 0 !important;
          flex-shrink: 0 !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          position: absolute !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          top: 0 !important;
        }

        header > div:nth-child(2) img {
          max-height: 100px !important;
          height: auto !important;
          display: block !important;
          margin: 0 !important;
        }

        header > div:last-child {
          width: 40% !important;
          text-align: right !important;
          font-size: 11pt !important;
          line-height: 1.3 !important;
          margin-right: 0 !important;
          padding-right: 10px !important;
          flex-shrink: 0 !important;
        }

        h1 {
          font-size: 18pt !important;
          margin: 15px 0 !important;
        }

        table {
          font-size: 11pt !important;
          margin: 10px 0 !important;
        }

        th,
        td {
          padding: 3px 4px !important;
          font-size: 11pt !important;
        }

        .group-row td {
          background: #f0f0f0 !important;
          font-weight: bold !important;
          font-size: 14pt !important;
          padding: 5px 4px !important;
          text-align: center !important;
          vertical-align: middle !important;
        }

        tfoot td {
          font-weight: bold !important;
          font-size: 14pt !important;
        }

        input,
        textarea {
          border: none !important;
          background: transparent !important;
          pointer-events: none !important;
          font-size: 11pt !important;
          padding: 0 !important;
        }

        input#clientName {
          font-weight: normal !important;
          font-size: 12pt !important;
        }

        footer {
          margin-top: 30px !important;
          height: auto !important;
          page-break-inside: avoid !important;
          display: flex !important;
          gap: 20px !important;
        }

        .footer-left {
          width: 350px !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
          height: auto !important;
        }

        .max-w-none {
          padding: 0 !important;
        }

        .mb-8,
        .mt-10,
        .mb-6,
        .mt-16 {
          margin: 10px 0 !important;
        }
      }

      @media print {
        .absolute[style*="left: ${fixedStampPosition.x}px"] {
          left: ${fixedStampPosition.x * 0.4}px !important;
        }

        .absolute[style*="top: ${fixedStampPosition.y}px"] {
          top: ${fixedStampPosition.y * 0.8}px !important;
          width: 220px !important;
          height: 220px !important;
          opacity: 0.7 !important;
          z-index: 9999 !important;
          pointer-events: none !important;
          display: block !important;
        }

        .absolute[style*="left: ${fixedStampPosition.x}px"] img {
          width: 220px !important;
          height: 220px !important;
          object-fit: contain !important;
        }

        .signature-text {
          position: relative !important;
          z-index: 1 !important;
        }
      }

      @media print {
        .absolute[style*="left: ${fixedSignaturePosition.x}px"] {
          left: ${fixedSignaturePosition.x * 0.4}px !important;
        }

        .absolute[style*="top: ${fixedSignaturePosition.y}px"] {
          top: ${fixedSignaturePosition.y * 0.8}px !important;
          width: 80px !important;
          height: 80px !important;
          opacity: 0.7 !important;
          z-index: 9998 !important;
          pointer-events: none !important;
          display: block !important;
        }

        .absolute[style*="left: ${fixedSignaturePosition.x}px"] img {
          width: 80px !important;
          height: 80px !important;
          object-fit: contain !important;
        }
      }

      @page {
        margin: 1cm;
        size: A4;
      }

      td select {
        text-align: center !important;
        text-align-last: center !important;
      }

      .group-row td {
        text-align: center !important;
        vertical-align: middle !important;
      }

      table td {
        vertical-align: middle !important;
      }

      table td input {
        text-align: center !important;
      }

      @media print {
        select {
          border: none !important;
          background: transparent !important;
          pointer-events: none !important;
          font-size: 11pt !important;
          padding: 0 !important;
          text-align: center !important;
          text-align-last: center !important;
          appearance: none !important;
        }
      }

      @media (max-width: 640px) {
        .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
        }

        table {
          min-width: 600px;
        }

        input[type="number"],
        input[type="text"] {
          font-size: 16px !important;
        }

        select {
          font-size: 16px !important;
        }
      }
    `}</style>
    </div>
  )
}
