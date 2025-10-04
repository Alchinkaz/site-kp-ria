"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Eye, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { InvoiceService, type Invoice } from "@/lib/invoice-service"

interface InvoiceListDialogProps {
  isOpen: boolean
  onClose: () => void
  onView: (invoice: Invoice) => void
}

export function InvoiceListDialog({ isOpen, onClose, onView }: InvoiceListDialogProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadInvoices()
    }
  }, [isOpen])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const data = await InvoiceService.getAllInvoices()
      setInvoices(data)
    } catch (error) {
      console.error("Error loading invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (invoice: Invoice) => {
    if (confirm(`Вы уверены, что хотите удалить счет "${invoice.invoice_number}"?`)) {
      const success = await InvoiceService.deleteInvoice(invoice.id)
      if (success) {
        setInvoices(invoices.filter((inv) => inv.id !== invoice.id))
        alert("Счет успешно удален.")
      } else {
        alert("Ошибка при удалении счета.")
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU")
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ru-RU") + " ₸"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Список счетов</DialogTitle>
          <DialogDescription>Выберите счет для просмотра или удалите его.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          {loading ? (
            <p className="text-center text-gray-500">Загрузка счетов...</p>
          ) : invoices.length === 0 ? (
            <p className="text-center text-gray-500">Нет сохраненных счетов.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-grow">
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-gray-600">
                      {invoice.client_name} • {formatDate(invoice.invoice_date)}
                    </div>
                    <div className="text-sm font-medium text-green-600">{formatAmount(invoice.total_amount)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onView(invoice)
                        onClose()
                      }}
                      title="Просмотреть счет"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(invoice)} title="Удалить счет">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
