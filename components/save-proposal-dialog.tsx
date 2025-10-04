"use client"

import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cloud } from "lucide-react"
import React from "react"

interface SaveProposalDialogProps {
  isOpen: boolean
  onClose: () => void
  onSaveCloud: (name: string) => void
  suggestedName: string
}

export function SaveProposalDialog({ isOpen, onClose, onSaveCloud, suggestedName }: SaveProposalDialogProps) {
  const [proposalName, setProposalName] = useState(suggestedName)

  const handleSave = () => {
    if (!proposalName.trim()) {
      alert("Введите название предложения")
      return
    }

    onSaveCloud(proposalName.trim())
    onClose()
  }

  // Update proposal name when suggested name changes
  React.useEffect(() => {
    setProposalName(suggestedName)
  }, [suggestedName])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Сохранить в облаке
          </DialogTitle>
          <DialogDescription>Предложение будет сохранено в облаке и доступно с любого устройства.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cloud-name">Название предложения</Label>
            <Input
              id="cloud-name"
              value={proposalName}
              onChange={(e) => setProposalName(e.target.value)}
              placeholder="Введите название..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            <Cloud className="w-4 h-4 mr-2" />
            Сохранить в облаке
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SaveProposalDialog
