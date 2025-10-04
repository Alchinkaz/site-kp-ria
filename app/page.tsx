"use client"

import { useRouter } from "next/navigation"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react" // Import useRef and useCallback
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
  FolderOpen,
  FilePlus,
  Download,
  MoreHorizontal,
  Undo2,
  Redo2,
} from "lucide-react"
import { LoadProposalDialog } from "@/components/load-proposal-dialog"
import { SaveProposalDialog } from "@/components/save-proposal-dialog"
import { InvoiceListDialog } from "@/components/invoice-list-dialog"
import { InvoiceService, type Invoice } from "@/lib/invoice-service"
import { createClient } from "@/lib/supabase/client"
import { storageManager, type ProposalData } from "@/lib/storage"
import * as XLSX from "xlsx"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

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

interface Position {
  x: number
  y: number
}

// Define Snapshot interface for history
interface Snapshot {
  rows: TableRow[]
  clientName: string
  notes: string
  proposalNumber: string
  editableDate: string
}

// Фиксированные позиции для печати и подписи
const fixedStampPosition: Position = { x: -20, y: 10 }
const fixedSignaturePosition: Position = { x: 0, y: 40 }

export default function CommercialProposal() {
  const [clientName, setClientName] = useState("********")
  const [currentDate, setCurrentDate] = useState("")
  const defaultNotesText = `1) Цены указаны в тенге
2) Все необходимые дополнительные опции определяются при анализе проекта.
3) Срок выполнения работ/поставки - 5 рабочих д(ней)(ень)
4) Условия оплаты - 100 %.`
  const [notes, setNotes] = useState(defaultNotesText)
  const [rows, setRows] = useState<TableRow[]>([])
  const [proposalNumber, setProposalNumber] = useState("")
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const router = useRouter()
  const [editableDate, setEditableDate] = useState("")
  const [showInvoiceListDialog, setShowInvoiceListDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showTotal, setShowTotal] = useState(true)

  // History management using useRef and a dummy state for re-renders
  const historyRef = useRef<{ history: Snapshot[]; index: number }>({ history: [], index: -1 })
  const [historyVersion, setHistoryVersion] = useState(0) // Dummy state to force re-render for button disabled status
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null) // Ref for the notes textarea

  // Function to save the current state as a snapshot
  const saveCurrentStateToHistory = useCallback(() => {
    const currentSnapshot: Snapshot = {
      rows,
      clientName,
      notes,
      proposalNumber,
      editableDate,
    }

    const { history, index } = historyRef.current

    // Deep comparison to avoid saving identical states repeatedly
    if (index >= 0 && JSON.stringify(history[index]) === JSON.stringify(currentSnapshot)) {
      return
    }

    const newHistory = history.slice(0, index + 1) // Clear redo history if new action
    newHistory.push(currentSnapshot)

    historyRef.current = {
      history: newHistory,
      index: newHistory.length - 1,
    }
    setHistoryVersion((prev) => prev + 1) // Force re-render of components that depend on history state (like buttons)
    console.log("Snapshot saved to history. New index:", historyRef.current.index)
  }, []) // Empty dependency array to prevent recreation on state changes

  // Function to adjust the height of the notes textarea
  const adjustNotesHeight = useCallback(() => {
    if (notesTextareaRef.current) {
      notesTextareaRef.current.style.height = "auto" // Reset height to recalculate
      notesTextareaRef.current.style.height = notesTextareaRef.current.scrollHeight + "px"
    }
  }, [])

  // Function to generate a new proposal number
  const generateProposalNumber = (increment = false) => {
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const day = now.getDate().toString().padStart(2, "0")
    const todayDate = `${year}${month}${day}`

    let lastSequenceData = { date: "", sequence: 0 }
    try {
      const stored = localStorage.getItem("v0_last_proposal_sequence")
      if (stored) {
        lastSequenceData = JSON.parse(stored)
      }
    } catch (error) {
      console.error("Failed to parse last proposal sequence from localStorage:", error)
    }

    let newSequence = 1
    let shouldUpdateLocalStorage = false

    if (lastSequenceData.date === todayDate) {
      if (increment) {
        newSequence = lastSequenceData.sequence + 1
        shouldUpdateLocalStorage = true
      } else {
        newSequence = lastSequenceData.sequence
      }
    } else {
      newSequence = 1
      shouldUpdateLocalStorage = true
    }

    if (shouldUpdateLocalStorage) {
      localStorage.setItem("v0_last_proposal_sequence", JSON.stringify({ date: todayDate, sequence: newSequence }))
    }

    return `КП-${todayDate}-${String(newSequence).padStart(3, "0")}`
  }

  // Initial load and setup
  useEffect(() => {
    const now = new Date()
    const dateStr = now.toLocaleDateString("ru-RU")
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    setCurrentDate(`${dateStr}, ${timeStr}`)

    let initialRows: TableRow[] = []
    let initialClientName = "********"
    let initialNotes: string = defaultNotesText
    let initialProposalNumber: string = generateProposalNumber()
    let initialEditableDate: string = dateStr

    try {
      const autosavedData = localStorage.getItem("v0_autosave_data")
      if (autosavedData) {
        const parsedData = JSON.parse(autosavedData)
        initialRows = parsedData.rows || []
        initialClientName = parsedData.clientName || "********"
        initialNotes = parsedData.notes || defaultNotesText
        initialProposalNumber = parsedData.proposalNumber || generateProposalNumber()
        initialEditableDate = parsedData.editableDate || dateStr
        console.log("Autosaved data loaded on mount.")
      } else {
        console.log("No autosaved data, loading default.")
      }
    } catch (error) {
      console.error("Failed to load autosaved data on mount, falling back to default:", error)
    }

    setRows(initialRows)
    setClientName(initialClientName)
    setNotes(initialNotes)
    setProposalNumber(initialProposalNumber)
    setEditableDate(initialEditableDate)

    // Initialize history with the loaded/default state
    historyRef.current = {
      history: [
        {
          rows: initialRows,
          clientName: initialClientName,
          notes: initialNotes,
          proposalNumber: initialProposalNumber,
          editableDate: initialEditableDate,
        },
      ],
      index: 0,
    }
    setHistoryVersion(1) // Trigger re-render after initial history setup
    console.log("History initialized with initial state.")
  }, []) // Empty dependency array for initial load only

  // Effect for automatic saving to localStorage
  useEffect(() => {
    const dataToSave: Snapshot = {
      rows,
      clientName,
      notes,
      proposalNumber,
      editableDate,
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("v0_autosave_data", JSON.stringify(dataToSave))
        console.log("Autosaved current state to localStorage.")
      } catch (error) {
        console.error("Failed to autosave data to localStorage:", error)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [rows, clientName, notes, proposalNumber, editableDate])

  // Effect for managing history (debounced)
  const isInitialHistoryMount = useRef(true) // To prevent saving initial empty state
  useEffect(() => {
    if (isInitialHistoryMount.current) {
      isInitialHistoryMount.current = false
      return // Skip first render to avoid duplicate initial snapshot
    }

    const timer = setTimeout(() => {
      saveCurrentStateToHistory()
    }, 500) // Debounce time for history saving

    return () => clearTimeout(timer)
  }, [rows, clientName, notes, proposalNumber, editableDate]) // Removed saveCurrentStateToHistory from dependencies

  // Effect to adjust notes height on initial load and when notes change
  useEffect(() => {
    adjustNotesHeight()
  }, [notes, adjustNotesHeight])

  // Undo/Redo functions
  const handleUndo = () => {
    const { history, index } = historyRef.current
    if (index > 0) {
      const newIndex = index - 1
      const snapshot = history[newIndex]
      setRows(snapshot.rows)
      setClientName(snapshot.clientName)
      setNotes(snapshot.notes)
      setProposalNumber(snapshot.proposalNumber)
      setEditableDate(snapshot.editableDate)
      historyRef.current.index = newIndex
      setHistoryVersion((prev) => prev + 1) // Force re-render
      console.log("Undone to state at index:", newIndex)
    }
  }

  const handleRedo = () => {
    const { history, index } = historyRef.current
    if (index < history.length - 1) {
      const newIndex = index + 1
      const snapshot = history[newIndex]
      setRows(snapshot.rows)
      setClientName(snapshot.clientName)
      setNotes(snapshot.notes)
      setProposalNumber(snapshot.proposalNumber)
      setEditableDate(snapshot.editableDate)
      historyRef.current.index = newIndex
      setHistoryVersion((prev) => prev + 1) // Force re-render
      console.log("Redone to state at index:", newIndex)
    }
  }

  const updateSum = (id: string, field: "quantity" | "price", value: number) => {
    setRows((prevRows) => {
      const updatedRows = prevRows.map((row) => {
        if (row.id === id && row.type === "item") {
          const updatedRow = { ...row, [field]: value }
          updatedRow.sum = updatedRow.quantity * updatedRow.price
          return updatedRow
        }
        return row
      })
      return updatedRows
    })
  }

  const updateName = (id: string, name: string) => {
    setRows((prevRows) => prevRows.map((row) => (row.id === id ? { ...row, name } : row)))
  }

  const updateUnit = (id: string, unit: string) => {
    setRows((prevRows) => prevRows.map((row) => (row.id === id ? { ...row, unit } : row)))
  }

  const addRow = () => {
    const newId = `item-${Date.now()}`
    const newRow: TableRow = {
      id: newId,
      type: "item",
      name: "",
      quantity: 1,
      unit: "шт.",
      price: 0,
      sum: 0,
    }
    setRows((prevRows) => [...prevRows, newRow])
  }

  const addRowToGroup = (groupId: string) => {
    const groupIndex = rows.findIndex((row) => row.id === groupId)
    if (groupIndex === -1) return

    let insertIndex = groupIndex + 1
    for (let i = groupIndex + 1; i < rows.length; i++) {
      if (rows[i].type === "group") break
      insertIndex = i + 1
    }

    const newId = `item-${Date.now()}`
    const newRow: TableRow = {
      id: newId,
      type: "item",
      name: "",
      quantity: 1,
      unit: "шт.",
      price: 0,
      sum: 0,
    }

    const newRows = [...rows]
    newRows.splice(insertIndex, 0, newRow)
    setRows(newRows)
  }

  const addGroup = () => {
    const groupName = prompt("Введите название группы товаров:")
    if (!groupName || !groupName.trim()) return

    const newGroup: TableRow = {
      id: `group-${Date.now()}`,
      type: "group",
      name: groupName.trim(),
      quantity: 0,
      unit: "",
      price: 0,
      sum: 0,
    }
    setRows((prevRows) => [...prevRows, newGroup])
  }

  const handlePrint = () => {
    window.print()
  }

  const removeRow = (id: string) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== id))
  }

  const moveGroup = (groupId: string, direction: "up" | "down") => {
    setRows((prevRows) => {
      const currentGroupStartIndex = prevRows.findIndex((row) => row.id === groupId)
      if (currentGroupStartIndex === -1 || prevRows[currentGroupStartIndex].type !== "group") {
        return prevRows
      }

      let currentGroupEndIndex = currentGroupStartIndex
      for (let i = currentGroupStartIndex + 1; i < prevRows.length; i++) {
        if (prevRows[i].type === "group") break
        currentGroupEndIndex = i
      }
      const currentGroupBlock = prevRows.slice(currentGroupStartIndex, currentGroupEndIndex + 1)

      const newRows = [...prevRows]
      newRows.splice(currentGroupStartIndex, currentGroupBlock.length)

      let targetInsertionIndex = -1

      if (direction === "up") {
        if (currentGroupStartIndex === 0) {
          return prevRows
        }

        const prevElementIndexInNewRows = currentGroupStartIndex - 1

        if (prevElementIndexInNewRows < 0) {
          return prevRows
        }

        let prevBlockActualStartIndex = prevElementIndexInNewRows
        if (newRows[prevElementIndexInNewRows].type === "group") {
          for (let i = prevElementIndexInNewRows - 1; i >= 0; i--) {
            if (newRows[i].type === "group") {
              prevBlockActualStartIndex = i
              break
            }
          }
        }
        targetInsertionIndex = prevBlockActualStartIndex
      } else if (direction === "down") {
        if (currentGroupEndIndex === prevRows.length - 1) {
          return prevRows
        }

        const nextElementIndexInNewRows = currentGroupStartIndex

        if (nextElementIndexInNewRows >= newRows.length) {
          return prevRows
        }

        let nextBlockActualEndIndex = nextElementIndexInNewRows
        if (newRows[nextElementIndexInNewRows].type === "group") {
          for (let i = nextElementIndexInNewRows + 1; i < newRows.length; i++) {
            if (newRows[i].type === "group") break
            nextBlockActualEndIndex = i
          }
        }
        targetInsertionIndex = nextBlockActualEndIndex + 1
      }

      if (targetInsertionIndex !== -1) {
        newRows.splice(targetInsertionIndex, 0, ...currentGroupBlock)
        return newRows
      } else {
        return prevRows
      }
    })
  }

  const calculateTotal = () => {
    return rows.filter((row) => row.type === "item").reduce((total, row) => total + row.sum, 0)
  }

  const calculateGroupSum = (groupIndex: number) => {
    let sum = 0
    for (let i = groupIndex + 1; i < rows.length; i++) {
      if (rows[i].type === "group") break
      if (rows[i].type === "item") {
        sum += rows[i].sum
      }
    }
    return sum
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("ru-RU")
  }

  // Функции для сохранения и загрузки
  const saveProposal = () => {
    setShowSaveDialog(true)
  }

  const handleSaveCloud = async (proposalName: string) => {
    setIsSaving(true)
    try {
      console.log("Starting cloud save process...")

      // Проверяем подключение к Supabase
      const supabase = createClient()
      const { data: testData, error: testError } = await supabase.from("proposals").select("count").limit(1)

      if (testError) {
        console.error("Supabase connection test failed:", testError)
        alert(
          `Ошибка подключения к базе данных: ${testError.message}\nКод: ${testError.code}\nДетали: ${testError.details}`,
        )
        return
      }

      console.log("Supabase connection test passed:", testData)

      const currentProposal: ProposalData = {
        proposalNumber, // Use the actual proposal number from the form
        clientName,
        proposalDate: editableDate,
        notes,
        rows,
      }

      // Pass the proposal name to the storage manager
      const savedId = await storageManager.saveProposal(currentProposal, proposalName)
      if (savedId) {
        alert(`Предложение "${proposalName}" успешно сохранено!`)
      }
    } catch (error) {
      console.error("Failed to save proposal:", error)
      alert(`Ошибка при сохранении предложения: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  const loadProposal = async () => {
    setShowLoadDialog(true)
  }

  const handleNewProposal = async () => {
    const confirmNew = confirm("Вы хотите сохранить текущее коммерческое предложение перед созданием нового?")
    if (confirmNew) {
      try {
        const currentProposal: ProposalData = {
          proposalNumber,
          clientName,
          proposalDate: editableDate,
          notes,
          rows,
        }
        await storageManager.saveProposal(currentProposal)
        alert("Текущее предложение сохранено!")
      } catch (error) {
        console.error("Failed to save current proposal:", error)
        alert("Ошибка при сохранении текущего предложения.")
      }
    }

    setRows([])
    setClientName("********")
    setNotes(defaultNotesText)
    setProposalNumber(generateProposalNumber(true))
    setEditableDate(new Date().toLocaleDateString("ru-RU"))
    alert("Создано новое коммерческое предложение.")
  }

  const handleSaveProposal = async () => {
    const proposalName = proposalNumber // Assuming proposalNumber is used as the name for saving
    if (!proposalName.trim()) {
      alert("Пожалуйста, введите название предложения")
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()

      // Проверяем подключение к Supabase
      const { data: testData, error: testError } = await supabase.from("proposals").select("count").limit(1)

      if (testError) {
        console.error("Supabase connection test failed:", testError)
        alert(
          `Ошибка подключения к базе данных: ${testError.message}\nКод: ${testError.code}\nДетали: ${testError.details}`,
        )
        return
      }

      console.log("Supabase connection test passed:", testData)

      const currentProposal: ProposalData = {
        proposalNumber, // Use the actual proposal number from the form
        clientName,
        proposalDate: editableDate,
        notes,
        rows,
      }

      // Pass the proposal name to the storage manager
      const savedId = await storageManager.saveProposal(currentProposal, proposalName)
      if (savedId) {
        alert(`Предложение "${proposalName}" успешно сохранено!`)
      }
    } catch (error) {
      console.error("Failed to save proposal:", error)
      alert(`Ошибка при сохранении предложения: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveToExcel = () => {
    const headers = ["№", "Наименование", "Фото", "Кол-во", "Ед.", "Цена, ₸", "Сумма, ₸"]
    const data = rows.map((row, index) => {
      if (row.type === "item") {
        const sum = row.quantity * row.price
        const photoInfo = row.photo ? "Фото прикреплено" : "Нет фото"
        return [index + 1, row.name, photoInfo, row.quantity, row.unit, row.price, sum]
      } else {
        // type === "group"
        return [index + 1, row.name, "", "", "", "", ""] // For groups, only name is relevant for export
      }
    })

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Коммерческое предложение")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `КП-${proposalNumber}-${clientName.replace(/\s+/g, "_")}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    alert("Предложение успешно сохранено в Excel!")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (json.length === 0) {
          alert("Файл Excel пуст.")
          return
        }

        const headers = json[0]
        const nameColIndex = headers.indexOf("Наименование")
        const quantityColIndex = headers.indexOf("Кол-во")
        const unitColIndex = headers.indexOf("Ед.")
        const priceColIndex = headers.indexOf("Цена, ₸")

        if (nameColIndex === -1) {
          alert("В файле Excel отсутствует столбец 'Наименование'.")
          return
        }

        const newRows: TableRow[] = []
        for (let i = 1; i < json.length; i++) {
          const rowData = json[i]
          const name = rowData[nameColIndex]?.toString() || ""
          const quantity = Number.parseFloat(rowData[quantityColIndex]?.toString()) || 0
          const unit = rowData[unitColIndex]?.toString() || ""
          const price = Number.parseFloat(rowData[priceColIndex]?.toString()) || 0

          const isGroup = !quantity && !unit && !price

          newRows.push({
            id: `${isGroup ? "group" : "item"}-${Date.now()}-${i}`,
            type: isGroup ? "group" : "item",
            name: name,
            quantity: isGroup ? 0 : quantity,
            unit: isGroup ? "" : unit,
            price: isGroup ? 0 : price,
            sum: isGroup ? 0 : quantity * price,
          })
        }

        setRows(newRows)
        setClientName("********")
        setNotes(defaultNotesText) // Устанавливаем defaultNotesText при загрузке из Excel
        setProposalNumber(generateProposalNumber(true))
        setEditableDate(new Date().toLocaleDateString("ru-RU"))
        alert("Данные успешно загружены из Excel!")
      } catch (error) {
        console.error("Ошибка при чтении файла Excel:", error)
        alert("Ошибка при чтении файла Excel. Убедитесь, что формат файла корректен.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleGenerateInvoice = () => {
    const dataToPass = {
      rows,
      clientName,
      proposalNumber,
      notes,
    }
    localStorage.setItem("v0_current_proposal_for_invoice", JSON.stringify(dataToPass))
    router.push("/invoice")
  }

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const invoiceWithItems = await InvoiceService.getInvoiceById(invoice.id)
      if (invoiceWithItems) {
        // Convert Supabase data back to the format expected by the invoice page
        const invoiceData = {
          rows: invoiceWithItems.invoice_items.map((item) => ({
            id: item.id,
            type: item.item_type,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            sum: item.sum,
          })),
          clientName: invoiceWithItems.client_name,
          proposalNumber: invoiceWithItems.proposal_number || "",
          notes: invoiceWithItems.notes || "",
        }

        localStorage.setItem("v0_current_proposal_for_invoice", JSON.stringify(invoiceData))
        router.push("/invoice")
      } else {
        alert("Ошибка при загрузке счета.")
      }
    } catch (error) {
      console.error("Error viewing invoice:", error)
      alert("Ошибка при загрузке счета.")
    }
  }

  const handleViewInvoicesList = () => {
    setShowInvoiceListDialog(true)
  }

  const testSupabaseConnection = async () => {
    try {
      console.log("Testing Supabase connection...")
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("Supabase Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      const supabase = createClient()

      // Проверяем подключение к таблице proposals
      const { data: proposalsData, error: proposalsError } = await supabase.from("proposals").select("count").limit(1)

      if (proposalsError) {
        console.error("Proposals table error:", proposalsError)
        alert(
          `Ошибка доступа к таблице proposals: ${proposalsError.message}\nКод: ${proposalsError.code}\nДетали: ${proposalsError.details || "Нет дополнительных деталей"}`,
        )
        return
      }

      // Проверяем подключение к таблице invoices
      const { data: invoicesData, error: invoicesError } = await supabase.from("invoices").select("count").limit(1)

      if (invoicesError) {
        console.error("Invoices table error:", invoicesError)
        alert(
          `Ошибка доступа к таблице invoices: ${invoicesError.message}\nКод: ${invoicesError.code}\nДетали: ${invoicesError.details || "Нет дополнительных деталей"}`,
        )
        return
      }

      console.log("Supabase connection successful")
      console.log("Proposals data:", proposalsData)
      console.log("Invoices data:", invoicesData)
      alert(`Подключение к Supabase успешно!\nТаблица proposals: доступна\nТаблица invoices: доступна`)
    } catch (error) {
      console.error("Connection test error:", error)
      alert(`Ошибка при тестировании подключения: ${error}`)
    }
  }

  const handleSelectProposal = (proposal: ProposalData) => {
    setRows(proposal.rows || [])
    setClientName(proposal.clientName || "********")
    setNotes(proposal.notes || defaultNotesText)
    setProposalNumber(proposal.proposalNumber || generateProposalNumber())
    setEditableDate(proposal.proposalDate || new Date().toLocaleDateString("ru-RU"))
    alert(`Предложение "${proposal.proposalNumber}" успешно загружено!`)
  }

  const handleLoadProposal = (proposalData: ProposalData) => {
    console.log("[v0] Loading proposal data:", proposalData)

    // Restore all form fields
    setRows(proposalData.rows || [])
    setClientName(proposalData.clientName || "")
    setNotes(proposalData.notes || "")
    setProposalNumber(proposalData.proposalNumber || "")
    setEditableDate(proposalData.proposalDate || new Date().toLocaleDateString("ru-RU"))

    // Close the load dialog
    setShowLoadDialog(false)

    console.log("[v0] Proposal loaded successfully")
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-none mx-auto p-4 sm:p-6 md:p-8 print:p-2 print:m-0">
        {/* Header */}
        <header className="border-b-4 border-black pb-4 sm:pb-6 md:pb-8 mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center print:mb-6 gap-4 sm:gap-0">
          <div className="w-full sm:w-2/5 text-xs sm:text-sm leading-relaxed order-1">
            <strong>ТОО «Ria Safety»</strong>
            <br />
            БИН: 180940004456
            <br />
            АО "Bereke Bank"
            <br />
            KZ23914082203KZ018CM
            <br />
            БИК: BRKEKZKA
            <br />
            Юр.Адрес: РК, Мангистауская область, г.Актау, 3Б микрорайон, 40 здание
            <br />
          </div>
          <div className="w-full sm:w-1/5 text-center order-2">
            <img
              src="/images/ria-logo.png"
              alt="Логотип компании Ria Safety"
              className="max-h-30 sm:max-h-36 md:max-h-48 h-auto inline-block"
            />
          </div>
          <div className="w-full sm:w-2/5 text-left sm:text-right text-xs sm:text-sm leading-relaxed pr-0 sm:pr-3 order-3">
            Тел.: + 7 771 116 57 59
            <br />
            E-mail: info@ria-aktau.kz
            <br />
            Сайт: ria-safety.kz
            <br />
            Instagram: @ria_safety
            <br />
            Директор: Жулдубаева Римма С.
            <br />
          </div>
        </header>

        {/* Title */}
        <h1 className="text-center text-lg sm:text-xl md:text-2xl font-bold mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8">
          КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ
        </h1>

        {/* Client Info */}
        <div className="mb-4 sm:mb-6">
          {/* Этот div будет виден только при печати */}
          <div className="text-right text-sm mb-4 print:block hidden">{editableDate}</div>
          <p className="mb-2">
            <strong>Заказчик:</strong>
            <br />
            <Textarea
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value)
                // Автоматически подстраиваем высоту
                e.target.style.height = "auto"
                e.target.style.height = e.target.scrollHeight + "px"
              }}
              onBlur={saveCurrentStateToHistory} // Save on blur
              className="w-full sm:w-80 mt-1 text-left text-sm sm:text-base border border-gray-300 print:border-none print:bg-transparent print:font-normal resize-none overflow-hidden min-h-[40px]"
              rows={1}
            />
          </p>
          <p className="mb-2">
            <strong>Номер предложения:</strong>
            <br />
            <Input
              type="text"
              value={proposalNumber}
              onChange={(e) => setProposalNumber(e.target.value)}
              onBlur={saveCurrentStateToHistory} // Save on blur
              className="w-full sm:w-80 mt-1 text-left text-sm:text-base border border-gray-300 print:border-none print:shadow-none print:outline-none"
            />
          </p>
          {/* Этот параграф будет скрыт при печати */}
          <p className="mb-2 print:hidden">
            <strong>Дата:</strong>
            <br />
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="date"
                value={
                  editableDate ? new Date(editableDate.split(".").reverse().join("-")).toISOString().split("T")[0] : ""
                }
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value)
                  setEditableDate(selectedDate.toLocaleDateString("ru-RU"))
                }}
                onBlur={saveCurrentStateToHistory} // Save on blur
                className="w-full sm:w-80 text-left text-sm:text-base border border-gray-300"
              />
              <Button
                onClick={addRow}
                className="bg-green-500 hover:bg-green-600 text-white p-2 h-10 w-10 flex items-center justify-center print:hidden"
                title="Добавить строку"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-full px-4 sm:px-0">
            <table className="w-full border-collapse mt-5 text-xs sm:text-sm">
              <colgroup>
                <col className="w-[6%] sm:w-[5%]" />
                <col className="w-[25%] sm:w-[30%]" />
                <col className="w-[15%] sm:w-[12%]" />
                <col className="w-[10%] sm:w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[15%] sm:w-[12%]" />
                <col className="w-[15%] sm:w-[12%]" />
                <col className="w-[6%] sm:w-[8%] print:hidden" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">№</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Наименование</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Фото</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Кол-во</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Ед.</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Цена, ₸</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center text-xs">Сумма, ₸</th>
                  <th className="border border-gray-300 bg-gray-100 p-1 sm:p-2 text-center print:hidden text-xs">×</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  if (row.type === "group") {
                    const groupSum = calculateGroupSum(index)
                    return (
                      <tr key={row.id} className="group-row">
                        <td
                          colSpan={6}
                          className="border border-gray-300 bg-gray-100 font-bold text-center p-1 sm:p-2 text-xs sm:text-base relative print:bg-gray-100"
                        >
                          <Textarea
                            value={row.name}
                            onChange={(e) => {
                              updateName(row.id, e.target.value)
                              // Автоматически подстраиваем высоту
                              e.target.style.height = "auto"
                              e.target.style.height = e.target.scrollHeight + "px"
                            }}
                            onBlur={saveCurrentStateToHistory}
                            className="w-full border-none text-center text-xs p-1 print:bg-transparent font-bold resize-none overflow-hidden min-h-[24px]"
                            rows={1}
                          />
                          <div className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 flex gap-1 print:hidden">
                            <Button
                              onClick={() => moveGroup(row.id, "up")}
                              className="bg-gray-400 hover:bg-gray-500 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 p-0"
                              size="sm"
                              title="Переместить группу вверх"
                            >
                              <ArrowUp className="w-2 h-2 sm:w-3 sm:h-3" />
                            </Button>
                            <Button
                              onClick={() => moveGroup(row.id, "down")}
                              className="bg-gray-400 hover:bg-gray-500 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 p-0"
                              size="sm"
                              title="Переместить группу вниз"
                            >
                              <ArrowDown className="w-2 h-2 sm:w-3 sm:h-3" />
                            </Button>
                            <Button
                              onClick={() => addRowToGroup(row.id)}
                              className="bg-green-500 hover:bg-green-600 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 p-0"
                              size="sm"
                              title="Добавить строку в группу"
                            >
                              <Plus className="w-2 h-2 sm:w-3 sm:h-3" />
                            </Button>
                            <Button
                              onClick={() => removeRow(row.id)}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 p-0"
                              size="sm"
                              title="Удалить группу"
                            >
                              <X className="w-2 h-2 sm:w-3 sm:h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="border border-gray-300 bg-gray-100 font-bold text-center p-1 sm:p-2 text-sm sm:text-lg print:bg-gray-100">
                          <strong className="text-xs sm:text-base">{formatNumber(groupSum)} ₸</strong>
                        </td>
                        <td className="border border-gray-300 p-1 sm:p-2 print:hidden"></td>
                      </tr>
                    )
                  }

                  const itemNumber = rows.slice(0, index + 1).filter((r) => r.type === "item").length
                  return (
                    <tr key={row.id}>
                      <td className="border border-gray-300 p-1 text-center text-xs">{itemNumber}</td>
                      <td className="border border-gray-300 p-1">
                        <Textarea
                          value={row.name}
                          onChange={(e) => {
                            updateName(row.id, e.target.value)
                            // Автоматически подстраиваем высоту
                            e.target.style.height = "auto"
                            e.target.style.height = e.target.scrollHeight + "px"
                          }}
                          onBlur={saveCurrentStateToHistory}
                          className="w-full border-none text-center text-xs p-1 print:bg-transparent resize-none overflow-hidden min-h-[24px]"
                          rows={1}
                        />
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {row.photo ? (
                            <div className="relative">
                              <img
                                src={row.photo || "/placeholder.svg"}
                                alt="Фото товара"
                                className="w-48 h-72 sm:w-64 sm:h-96 object-contain rounded border"
                              />
                              <Button
                                onClick={() => {
                                  const updatedRows = rows.map((r) =>
                                    r.id === row.id ? { ...r, photo: undefined } : r,
                                  )
                                  setRows(updatedRows)
                                  saveCurrentStateToHistory()
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 p-0 print:hidden"
                                size="sm"
                                title="Удалить фото"
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer print:hidden">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const reader = new FileReader()
                                    reader.onload = (event) => {
                                      const updatedRows = rows.map((r) =>
                                        r.id === row.id ? { ...r, photo: event.target?.result as string } : r,
                                      )
                                      setRows(updatedRows)
                                      saveCurrentStateToHistory()
                                    }
                                    reader.readAsDataURL(file)
                                  }
                                }}
                              />
                              <div className="w-48 h-72 sm:w-64 sm:h-96 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:border-gray-400 transition-colors">
                                <Plus className="w-4 h-4 text-gray-400" />
                              </div>
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Input
                          type="number"
                          value={row.quantity === 0 ? "" : row.quantity}
                          onChange={(e) => updateSum(row.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                          onBlur={saveCurrentStateToHistory}
                          className="w-full border-none text-center text-xs p-1 print:bg-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <select
                          value={row.unit}
                          onChange={(e) => updateUnit(row.id, e.target.value)}
                          onBlur={saveCurrentStateToHistory}
                          className="w-full border-none text-center text-xs p-1 print:bg-transparent bg-transparent print:appearance-none"
                        >
                          <option value="шт.">шт.</option>
                          <option value="м.">м.</option>
                          <option value="усл.">усл.</option>
                          <option value="компл.">компл.</option>
                        </select>
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Input
                          type="number"
                          value={row.price === 0 ? "" : row.price}
                          onChange={(e) => updateSum(row.id, "price", Number.parseFloat(e.target.value) || 0)}
                          onBlur={saveCurrentStateToHistory}
                          className="w-full border-none text-center text-xs p-1 print:bg-transparent"
                        />
                      </td>
                      <td className="border border-gray-300 p-1 text-center font-medium text-xs">
                        {formatNumber(row.sum)}
                      </td>
                      <td className="border border-gray-300 p-1 text-center print:hidden">
                        <Button
                          onClick={() => removeRow(row.id)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 p-0"
                          size="sm"
                        >
                          <X className="w-2 h-2 sm:w-4 sm:h-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {showTotal && (
                <tfoot>
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-gray-300 p-1 sm:p-2 font-bold text-center text-xs sm:text-base"
                    >
                      ИТОГО:
                    </td>
                    <td className="border border-gray-300 p-1 sm:p-2 font-bold text-center text-sm sm:text-lg">
                      {formatNumber(calculateTotal())}
                    </td>
                    <td className="border border-gray-300 p-1 sm:p-2 print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="mt-4 print:hidden">
          <button
            onClick={() => setShowTotal(!showTotal)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            {showTotal ? "Скрыть итого" : "Показать итого"}
          </button>
        </div>

        {/* Notes */}
        <div className="mt-6 sm:mt-8 md:mt-10">
          <Textarea
            ref={notesTextareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveCurrentStateToHistory}
            className="w-full border border-gray-300 print:border-none print:bg-transparent print:font-normal resize-none overflow-hidden"
            rows={1}
          />
        </div>

        {/* Buttons for adding rows and groups */}
        <div className="mt-8 print:hidden">
          <div className="flex gap-2 mb-4">
            <Button onClick={addRow} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Добавить строку
            </Button>
            <Button onClick={addGroup} className="bg-green-500 hover:bg-green-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Добавить группу
            </Button>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-8 print:mt-12">
          <div className="flex justify-between items-end">
            <div className="flex-1">
              <p className="mb-2">С уважением,</p>
              <p className="mb-8">Менеджер Компании ТОО «Ria Safety»</p>
            </div>
            <div className="flex-shrink-0 ml-8">
              <div className="w-32 h-32 rounded-full border-4 border-blue-600 flex items-center justify-center bg-blue-50 relative">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-800">Ria Safety</div>
                  <div className="text-xs text-blue-600 mt-1">ТОО</div>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 m-2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 sm:mt-8 md:mt-10 flex justify-center gap-4 print:hidden">
          <Button onClick={handlePrint} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Save className="w-4 h-4 mr-2" />
            Сохранить как PDF
          </Button>
          <Button onClick={handleSaveToExcel} className="bg-green-500 hover:bg-green-600 text-white">
            <Download className="w-4 h-4 mr-2" />
            Сохранить как Excel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gray-700 hover:bg-gray-800 text-white print:hidden">
                <MoreHorizontal className="w-4 h-4 mr-2" />
                Действия
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 print:hidden">
              <DropdownMenuItem onClick={loadProposal}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Загрузить предложение
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNewProposal}>
                <FilePlus className="w-4 h-4 mr-2" />
                Новое предложение
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveProposal}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить предложение
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleUndo} disabled={historyRef.current.index <= 0}>
                <Undo2 className="w-4 h-4 mr-2" />
                Отменить
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRedo}
                disabled={historyRef.current.index >= historyRef.current.history.length - 1}
              >
                <Redo2 className="w-4 h-4 mr-2" />
                Повторить
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewInvoicesList}>
                <MoreHorizontal className="w-4 h-4 mr-2" />
                Список счетов
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Load Proposal Dialog */}
        {showLoadDialog && (
          <LoadProposalDialog onSelectProposal={handleLoadProposal} onClose={() => setShowLoadDialog(false)} />
        )}

        {/* Save Proposal Dialog */}
        {showSaveDialog && (
          <SaveProposalDialog onSaveProposal={handleSaveCloud} onClose={() => setShowSaveDialog(false)} />
        )}

        {/* Invoice List Dialog */}
        {showInvoiceListDialog && (
          <InvoiceListDialog
            onGenerateInvoice={handleGenerateInvoice}
            onViewInvoice={handleViewInvoice}
            onClose={() => setShowInvoiceListDialog(false)}
          />
        )}
      </div>
    </div>
  )
}
