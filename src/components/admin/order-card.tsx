'use client'

import { Button } from '@/components/ui/button'
import { formatPrice, formatDate } from '@/lib/utils'
import { Eye, Clock, Utensils, Package, CheckCircle, X } from 'lucide-react'
import type { Order } from '@/types'

interface OrderCardProps {
  order: Order
  onView: (order: Order) => void
  onUpdateStatus: (orderId: string, newStatus: string) => void
}

export function OrderCard({ order, onView, onUpdateStatus }: OrderCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'preparing':
        return <Utensils className="h-4 w-4" />
      case 'ready':
        return <Package className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <X className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'preparing':
        return 'text-blue-600 bg-blue-100'
      case 'ready':
        return 'text-green-600 bg-green-100'
      case 'completed':
        return 'text-green-700 bg-green-200'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing'
      case 'preparing':
        return 'ready'
      case 'ready':
        return 'completed'
      default:
        return null
    }
  }

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'Start Preparing'
      case 'preparing':
        return 'Mark Ready'
      case 'ready':
        return 'Complete'
      default:
        return null
    }
  }

  const nextStatus = getNextStatus(order.status)
  const nextStatusLabel = getNextStatusLabel(order.status)

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${getStatusColor(order.status)}`}>
            {getStatusIcon(order.status)}
          </div>
          <div>
            <p className="font-semibold text-lg">#{order.id}</p>
            <p className="text-sm text-gray-600">{order.customer_name}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount:</span>
          <span className="font-semibold text-orange-600">{formatPrice(order.total_amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Phone:</span>
          <span className="font-medium">{order.customer_phone}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">{formatDate(order.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onView(order)}
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        
        <div className="grid grid-cols-2 gap-2">
          {nextStatus && (
            <Button
              size="sm"
              onClick={() => onUpdateStatus(order.id, nextStatus)}
              className="bg-orange-500 hover:bg-orange-600 text-xs"
            >
              {nextStatusLabel}
            </Button>
          )}
          
          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              className="text-xs"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
