export interface CampaignCsvParseResult {
  delimiter: ',' | ';' | '\t'
  columns: string[]
  rows: Array<Record<string, string>>
}

export interface CampaignCsvMapping {
  phoneColumn: string
  variableColumns: Record<string, string>
}

export interface CampaignMappedRecipient {
  phone: string
  variables: Array<{ name: string; value: string }>
}

export interface CampaignCsvPreviewResult {
  totalRows: number
  validRows: number
  invalidRows: number
  duplicates: number
  sampleRows: Array<Record<string, string>>
  mappedRecipients: CampaignMappedRecipient[]
}

function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return ','

  const candidates: Array<',' | ';' | '\t'> = [',', ';', '\t']
  let best: ',' | ';' | '\t' = ','
  let bestScore = -1

  for (const delimiter of candidates) {
    const score = firstLine.split(delimiter).length
    if (score > bestScore) {
      best = delimiter
      bestScore = score
    }
  }

  return best
}

function parseDelimitedText(text: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  const pushCell = () => {
    currentRow.push(currentCell.trim())
    currentCell = ''
  }

  const pushRow = () => {
    if (currentRow.length === 0) return
    const hasContent = currentRow.some((cell) => cell.length > 0)
    if (hasContent) {
      rows.push(currentRow)
    }
    currentRow = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) {
      pushCell()
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      pushCell()
      pushRow()
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    pushCell()
    pushRow()
  }

  return rows
}

function buildColumns(headerRow: string[]): string[] {
  return headerRow.map((header, index) => {
    const trimmed = header.trim()
    return trimmed.length > 0 ? trimmed : `coluna_${index + 1}`
  })
}

export function parseCampaignCsv(text: string): CampaignCsvParseResult {
  const normalizedText = text.replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(normalizedText)
  const parsedRows = parseDelimitedText(normalizedText, delimiter)

  if (parsedRows.length === 0) {
    return { delimiter, columns: [], rows: [] }
  }

  const columns = buildColumns(parsedRows[0])
  const rows = parsedRows.slice(1).map((row) => {
    const record: Record<string, string> = {}

    columns.forEach((column, index) => {
      record[column] = row[index]?.trim() || ''
    })

    return record
  })

  return { delimiter, columns, rows }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function buildCampaignCsvPreview(
  rows: Array<Record<string, string>>,
  mapping: CampaignCsvMapping,
  templateVariableNames: string[],
): CampaignCsvPreviewResult {
  const seenPhones = new Set<string>()
  const mappedRecipients: CampaignMappedRecipient[] = []
  let invalidRows = 0
  let duplicates = 0

  for (const row of rows) {
    const phone = (row[mapping.phoneColumn] || '').trim()
    if (!phone) {
      invalidRows++
      continue
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      invalidRows++
      continue
    }

    if (seenPhones.has(normalizedPhone)) {
      duplicates++
      continue
    }

    seenPhones.add(normalizedPhone)
    mappedRecipients.push({
      phone,
      variables: templateVariableNames.map((name) => ({
        name,
        value: (row[mapping.variableColumns[name]] || '').trim(),
      })),
    })
  }

  return {
    totalRows: rows.length,
    validRows: mappedRecipients.length,
    invalidRows,
    duplicates,
    sampleRows: rows.slice(0, 5),
    mappedRecipients,
  }
}
