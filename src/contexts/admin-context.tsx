'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AdminContextType {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  isAdmin: false,
  isLoading: true
})

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

interface AdminProviderProps {
  children: ReactNode
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check initial auth state
    checkAdminStatus()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await checkUserAdminStatus(session.user)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsAdmin(false)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await checkUserAdminStatus(session.user)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Failed to check admin status:', error)
      setIsLoading(false)
    }
  }

  const checkUserAdminStatus = async (authUser: User) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', authUser.id)
        .single()

      if (error) {
        console.error('Failed to check admin status:', error)
        setUser(authUser)
        setIsAdmin(false)
      } else {
        setUser(authUser)
        setIsAdmin(userData?.is_admin || false)
      }
    } catch (error) {
      console.error('Failed to verify admin status:', error)
      setUser(authUser)
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminContext.Provider value={{ user, isAdmin, isLoading }}>
      {children}
    </AdminContext.Provider>
  )
}