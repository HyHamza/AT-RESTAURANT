'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { generateOrderId } from '@/lib/utils'
import { useAdmin } from '@/contexts/admin-context'

export default function TestNotificationsPage() {
  const { isAdmin, isLoading } = useAdmin()
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  const createTestOrder = async () => {
    setIsCreatingOrder(true)
    
    try {
      const orderId = generateOrderId()
      
      // Create a test order to trigger notification
      const { error } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          customer_phone: '+1234567890',
          total_amount: 25.99,
          status: 'pending',
          notes: 'Test order for notification system'
        })

      if (error) {
        throw error
      }

      alert('Test order created! Check for notification.')
    } catch (error: any) {
      console.error('Failed to create test order:', error)
      alert(`Failed to create test order: ${error.message}`)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">This page is only accessible to admin users.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Admin Notifications</CardTitle>
          <p className="text-gray-600">
            Use this page to test the admin notification system. Creating a test order will trigger a real-time notification.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click the button below to create a test order</li>
                <li>• A notification should appear in the top-right corner</li>
                <li>• The notification includes order details and a sound alert</li>
                <li>• Notifications auto-dismiss after 10 seconds</li>
                <li>• You can toggle sound on/off using the bell icon</li>
              </ul>
            </div>

            <Button
              onClick={createTestOrder}
              disabled={isCreatingOrder}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {isCreatingOrder ? 'Creating Test Order...' : 'Create Test Order'}
            </Button>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">Note:</h3>
              <p className="text-sm text-yellow-800">
                This creates a real order in the database. Use this only for testing purposes.
                The notification system works across all pages when you're logged in as an admin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}