'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from './button'
import { LoadingSpinner } from './loading-spinner'
import { downloadCSV, downloadExcel, ExportColumn } from '@/lib/export-utils'

interface ExportButtonProps {
  data: any[]
  columns: ExportColumn[]
  filename: string
  format?: 'csv' | 'excel' | 'both'
  disabled?: boolean
  className?: string
}

export function ExportButton({
  data,
  columns,
  filename,
  format = 'both',
  disabled = false,
  className
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = async (type: 'csv' | 'excel') => {
    if (data.length === 0) {
      alert('No data to export')
      return
    }

    setExporting(true)
    setShowMenu(false)

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))

      if (type === 'csv') {
        downloadCSV(data, columns, filename)
      } else {
        downloadExcel(data, columns, filename)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (format === 'csv') {
    return (
      <Button
        onClick={() => handleExport('csv')}
        disabled={disabled || exporting || data.length === 0}
        className={className}
      >
        {exporting ? (
          <>
            <LoadingSpinner size="sm" variant="white" className="mr-2" />
            Exporting...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </>
        )}
      </Button>
    )
  }

  if (format === 'excel') {
    return (
      <Button
        onClick={() => handleExport('excel')}
        disabled={disabled || exporting || data.length === 0}
        className={className}
      >
        {exporting ? (
          <>
            <LoadingSpinner size="sm" variant="white" className="mr-2" />
            Exporting...
          </>
        ) : (
          <>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </>
        )}
      </Button>
    )
  }

  // Both formats - show dropdown menu
  return (
    <div className="relative">
      <Button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || exporting || data.length === 0}
        className={className}
      >
        {exporting ? (
          <>
            <LoadingSpinner size="sm" variant="white" className="mr-2" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </>
        )}
      </Button>

      {showMenu && !exporting && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors"
            >
              <FileText className="h-4 w-4 text-gray-600" />
              <div>
                <div className="font-medium text-sm">Export as CSV</div>
                <div className="text-xs text-gray-500">Comma-separated values</div>
              </div>
            </button>
            
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors border-t border-gray-100"
            >
              <FileSpreadsheet className="h-4 w-4 text-gray-600" />
              <div>
                <div className="font-medium text-sm">Export as Excel</div>
                <div className="text-xs text-gray-500">Microsoft Excel format</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
