'use client'

import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  period?: string
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  period,
  className = ''
}: StatCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  }

  const iconColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-orange-600'
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {value}
            </p>
            {change && (
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}>
                  {change}
                </span>
                {period && (
                  <span className="text-xs text-gray-500">{period}</span>
                )}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-gradient-to-br from-orange-100 to-red-100 ${iconColors[trend]}`}>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
