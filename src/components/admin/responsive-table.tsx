'use client'

import { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/use-media-query'

interface ResponsiveTableProps {
  headers: string[]
  children: ReactNode
  mobileView?: ReactNode
}

/**
 * Responsive table component that switches between table and card view
 * based on screen size
 */
export function ResponsiveTable({ headers, children, mobileView }: ResponsiveTableProps) {
  const isMobile = useIsMobile()

  if (isMobile && mobileView) {
    return <div className="space-y-4">{mobileView}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {headers.map((header, index) => (
              <th
                key={index}
                className="text-left p-4 font-semibold text-gray-700 text-sm"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
