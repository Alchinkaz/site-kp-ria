const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
const teens = [
  "",
  "одиннадцать",
  "двенадцать",
  "тринадцать",
  "четырнадцать",
  "пятнадцать",
  "шестнадцать",
  "семнадцать",
  "восемнадцать",
  "девятнадцать",
]
const tens = [
  "",
  "десять",
  "двадцать",
  "тридцать",
  "сорок",
  "пятьдесят",
  "шестьдесят",
  "семьдесят",
  "восемьдесят",
  "девяносто",
]
const hundreds = [
  "",
  "сто",
  "двести",
  "триста",
  "четыреста",
  "пятьсот",
  "шестьсот",
  "семьсот",
  "восемьсот",
  "девятьсот",
]

const thousands = ["", "тысяча", "тысячи", "тысяч"]
const millions = ["", "миллион", "миллиона", "миллионов"]
const billions = ["", "миллиард", "миллиарда", "миллиардов"]

function pluralize(num: number, forms: string[]) {
  if (num % 10 === 1 && num % 100 !== 11) {
    return forms[1]
  }
  if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) {
    return forms[2]
  }
  return forms[3]
}

function convertChunk(num: number, gender: "male" | "female" = "male") {
  let result = ""
  const h = Math.floor(num / 100)
  const t = Math.floor((num % 100) / 10)
  const u = num % 10

  if (h > 0) {
    result += hundreds[h] + " "
  }

  if (t === 1) {
    result += teens[u] + " "
  } else {
    if (t > 0) {
      result += tens[t] + " "
    }
    if (u > 0) {
      if (gender === "female" && u === 1) result += "одна "
      else if (gender === "female" && u === 2) result += "две "
      else result += units[u] + " "
    }
  }
  return result.trim()
}

export function numberToWordsKZ(num: number): string {
  if (num === 0) {
    return "Ноль тенге 00 тиын"
  }

  const integerPart = Math.floor(num)
  const fractionalPart = Math.round((num - integerPart) * 100)

  let result = ""

  const b = Math.floor(integerPart / 1_000_000_000)
  const m = Math.floor((integerPart % 1_000_000_000) / 1_000_000)
  const t = Math.floor((integerPart % 1_000_000) / 1_000)
  const u = integerPart % 1_000

  if (b > 0) {
    result += convertChunk(b) + " " + pluralize(b, billions) + " "
  }
  if (m > 0) {
    result += convertChunk(m) + " " + pluralize(m, millions) + " "
  }
  if (t > 0) {
    result += convertChunk(t, "female") + " " + pluralize(t, thousands) + " "
  }
  if (u > 0) {
    result += convertChunk(u) + " "
  }

  result += pluralize(integerPart, ["тенге", "тенге", "тенге", "тенге"]) // Simplified pluralization for "тенге"

  const fractionalWords = String(fractionalPart).padStart(2, "0")
  result += ` ${fractionalWords} тиын`

  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1)
}
