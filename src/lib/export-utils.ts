/**
 * Export utilities for CSV and Excel file generation
 */

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any) => string
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], columns: ExportColumn[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // Create header row
  const headers = columns.map(col => `"${col.label}"`).join(',')
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key]
      
      // Apply custom formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value)
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '""'
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""')
      return `"${stringValue}"`
    }).join(',')
  })

  return [headers, ...rows].join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(data: any[], columns: ExportColumn[], filename: string) {
  const csv = convertToCSV(data, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Convert data to Excel-compatible HTML format
 * This creates an HTML table that Excel can open and format properly
 */
export function convertToExcelHTML(data: any[], columns: ExportColumn[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  const headerRow = columns.map(col => 
    `<th style="background-color: #e11b70; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd;">${escapeHTML(col.label)}</th>`
  ).join('')

  const dataRows = data.map((item, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9'
    const cells = columns.map(col => {
      let value = item[col.key]
      
      // Apply custom formatting if provided
      if (col.format && value !== null && value !== undefined) {
        value = col.format(value)
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = ''
      }
      
      return `<td style="padding: 8px; border: 1px solid #ddd; background-color: ${bgColor};">${escapeHTML(String(value))}</td>`
    }).join('')
    
    return `<tr>${cells}</tr>`
  }).join('')

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </body>
    </html>
  `
}

/**
 * Download Excel file
 */
export function downloadExcel(data: any[], columns: ExportColumn[], filename: string) {
  const html = convertToExcelHTML(data, columns)
  const blob = new Blob([html], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  })
  downloadBlob(blob, `${filename}.xls`)
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number): string {
  return `PKR ${amount.toFixed(2)}`
}


/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string): string {
  const date = new Date()
  const timestamp = date.toISOString().split('T')[0] // YYYY-MM-DD
  return `${prefix}_${timestamp}`
}
