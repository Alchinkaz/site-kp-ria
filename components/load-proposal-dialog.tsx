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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Trash2, Calendar, User, FileText, DollarSign } from "lucide-react"
import { storageManager, type ProposalData } from "@/lib/storage"
import { useState, useEffect } from "react"

interface LoadProposalDialogProps {
  onSelectProposal: (proposal: ProposalData) => void
  onClose: () => void
}

export function LoadProposalDialog({ onSelectProposal, onClose }: LoadProposalDialogProps) {
  const [proposals, setProposals] = useState<ProposalData[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProposals()
  }, [])

  const loadProposals = async () => {
    setLoading(true)
    try {
      const data = await storageManager.loadProposals()
      setProposals(data)
    } catch (error) {
      console.error("Error loading proposals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (proposalId: string) => {
    try {
      const proposal = await storageManager.loadProposalById(proposalId)
      if (proposal) {
        onSelectProposal(proposal)
        onClose()
      }
    } catch (error) {
      console.error("Error loading proposal:", error)
      alert("Ошибка при загрузке предложения.")
    }
  }

  const handleDelete = async (proposal: ProposalData) => {
    if (confirm(`Вы уверены, что хотите удалить предложение "${proposal.clientName} - ${proposal.proposalNumber}"?`)) {
      const success = await storageManager.deleteProposal(proposal.id!)
      if (success) {
        setProposals(proposals.filter((p) => p.id !== proposal.id))
        alert("Предложение успешно удалено.")
      } else {
        alert("Ошибка при удалении предложения.")
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU")
  }

  const calculateTotal = (rows: any[]) => {
    const total = rows.reduce((sum, row) => sum + (row.total || 0), 0)
    return total.toLocaleString("ru-RU") + " ₸"
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh]">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            Загрузить предложение
          </DialogTitle>
          <DialogDescription className="text-base">
            Выберите предложение для загрузки из сохраненных файлов.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full">
          <div className="flex items-center gap-2 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Сохраненные предложения</span>
            <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
              {proposals.length}
            </Badge>
          </div>

          <ScrollArea className="h-[400px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Загрузка предложений...</p>
                </div>
              </div>
            ) : proposals.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Нет сохраненных предложений</p>
                  <p className="text-gray-400 text-sm">Создайте новое предложение и сохраните его</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pr-4">
                {proposals.map((proposal) => (
                  <Card
                    key={proposal.id}
                    className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-grow space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-lg text-gray-900">{proposal.clientName}</h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {proposal.proposalNumber}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">Клиент:</span>
                              <span>{proposal.clientName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">Дата:</span>
                              <span>{proposal.proposalDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <span className="text-xl font-bold text-green-600">{calculateTotal(proposal.rows)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSelect(proposal.id!)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Загрузить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(proposal)}
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="px-6 bg-transparent">
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
