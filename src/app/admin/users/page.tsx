'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { Search, UserPlus, Shield, ShieldOff, Mail, Phone, Calendar, Filter } from 'lucide-react'
import { ExportButton } from '@/components/ui/export-button'
import { ExportColumn, formatDateForExport, formatCurrencyForExport, generateFilename } from '@/lib/export-utils'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface User {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
  is_admin?: boolean
  order_count?: number
  total_spent?: number
}

type UserFilter = 'all' | 'admins' | 'customers'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [userFilter, setUserFilter] = useState<UserFilter>('all')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      // Get all users with admin status
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('[AT RESTAURANT - Admin Users] Users fetch error:', usersError)
        return
      }

      // Get order statistics for each user
      const { data: orderStats, error: orderStatsError } = await supabase
        .from('orders')
        .select('user_id, total_amount, status')

      if (orderStatsError) {
        console.error('[AT RESTAURANT - Admin Users] Order stats error:', orderStatsError)
      }

      // Calculate user statistics
      const userStats = new Map()
      orderStats?.forEach(order => {
        if (order.user_id) {
          const current = userStats.get(order.user_id) || { count: 0, total: 0 }
          current.count += 1
          if (order.status === 'completed') {
            current.total += order.total_amount
          }
          userStats.set(order.user_id, current)
        }
      })

      // Combine all data
      const enrichedUsers = usersData?.map(user => ({
        ...user,
        order_count: userStats.get(user.id)?.count || 0,
        total_spent: userStats.get(user.id)?.total || 0
      })) || []

      setUsers(enrichedUsers)
    } catch (error) {
      console.error('[AT RESTAURANT - Admin Users] Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminStatus = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      // Update the is_admin column directly
      const { error } = await supabase
        .from('users')
        .update({ is_admin: !isCurrentlyAdmin })
        .eq('id', userId)

      if (error) throw error
      
      // Reload users to reflect changes
      await loadUsers()
    } catch (error: any) {
      console.error('[AT RESTAURANT - Admin Users] Error toggling admin status:', error)
      alert(`Failed to update admin status: ${error.message}`)
    }
  }

  const handleViewUser = async (user: User) => {
    setSelectedUser(user)
    setShowUserDetails(true)
  }

  // Filter users based on selected filter
  const getFilteredUsers = () => {
    let filtered = users

    // Apply role filter
    if (userFilter === 'admins') {
      filtered = filtered.filter(user => user.is_admin)
    } else if (userFilter === 'customers') {
      filtered = filtered.filter(user => !user.is_admin)
    }

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(user => {
        return (
          user.email.toLowerCase().includes(searchLower) ||
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.phone?.includes(searchQuery)
        )
      })
    }

    return filtered
  }

  const filteredUsers = getFilteredUsers()

  // Export columns configuration
  const exportColumns: ExportColumn[] = [
    { key: 'full_name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'is_admin', label: 'Role', format: (val) => val ? 'Admin' : 'Customer' },
    { key: 'order_count', label: 'Total Orders' },
    { key: 'total_spent', label: 'Total Spent', format: formatCurrencyForExport },
    { key: 'created_at', label: 'Member Since', format: formatDateForExport }
  ]

  const adminCount = users.filter(u => u.is_admin).length
  const customerCount = users.filter(u => !u.is_admin).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users and admin privileges</p>
        </div>
        
        <ExportButton
          data={filteredUsers}
          columns={exportColumns}
          filename={generateFilename(`users_${userFilter}`)}
          className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-600 mt-1">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{adminCount}</p>
              <p className="text-sm text-gray-600 mt-1">Administrators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{customerCount}</p>
              <p className="text-sm text-gray-600 mt-1">Customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Role Filter Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setUserFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  userFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                onClick={() => setUserFilter('admins')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  userFilter === 'admins'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admins ({adminCount})
              </button>
              <button
                onClick={() => setUserFilter('customers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  userFilter === 'customers'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Customers ({customerCount})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userFilter === 'all' && `All Users (${filteredUsers.length})`}
            {userFilter === 'admins' && `Administrators (${filteredUsers.length})`}
            {userFilter === 'customers' && `Customers (${filteredUsers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found</p>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-gray-50 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-medium text-lg">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <p className="font-semibold truncate">{user.full_name || 'No name provided'}</p>
                        {user.is_admin && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium whitespace-nowrap">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </p>
                      {user.phone && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          {user.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-sm">
                      <p className="font-medium">{user.order_count} orders</p>
                      <p className="text-gray-600">PKR {user.total_spent?.toFixed(2) || '0.00'} spent</p>
                      <p className="text-gray-500 text-xs">{formatDate(user.created_at)}</p>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewUser(user)}
                        className="flex-1 sm:flex-none"
                      >
                        View Details
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={user.is_admin ? "destructive" : "default"}
                        onClick={() => toggleAdminStatus(user.id, user.is_admin || false)}
                        className={user.is_admin ? "" : "bg-orange-500 hover:bg-orange-600"}
                      >
                        {user.is_admin ? (
                          <>
                            <ShieldOff className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Remove Admin</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Make Admin</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">User Details</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{selectedUser.full_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Account Status</label>
                      <p className="text-gray-900">
                        {selectedUser.is_admin ? (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded">
                            Administrator
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                            Regular User
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Account Statistics</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Member Since</label>
                      <p className="text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(selectedUser.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Orders</label>
                      <p className="text-gray-900">{selectedUser.order_count}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Spent</label>
                      <p className="text-gray-900">PKR {selectedUser.total_spent?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Average Order Value</label>
                      <p className="text-gray-900">
                        PKR {selectedUser.order_count && selectedUser.total_spent 
                          ? (selectedUser.total_spent / selectedUser.order_count).toFixed(2)
                          : '0.00'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  variant={selectedUser.is_admin ? "destructive" : "default"}
                  onClick={() => {
                    toggleAdminStatus(selectedUser.id, selectedUser.is_admin || false)
                    setShowUserDetails(false)
                  }}
                  className={selectedUser.is_admin ? "" : "bg-orange-500 hover:bg-orange-600"}
                >
                  {selectedUser.is_admin ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Remove Admin Access
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Grant Admin Access
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUserDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
