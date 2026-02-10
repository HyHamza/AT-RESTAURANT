'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ImageWithModal } from '@/components/ui/image-modal'
import { useCart } from '@/contexts/cart-context'
import { useToastHelpers } from '@/components/ui/toast'
import { formatPrice, generateOrderId } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { offlineUtils } from '@/lib/offline-db'
import { OrderSkeleton } from '@/components/skeletons/order-skeleton'
import { LocationPicker } from '@/components/location-picker'
import { LocationData } from '@/lib/location-service'
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User,
  Lock,
  MapPin,
  CreditCard,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { BackButton } from '@/components/ui/back-button'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function OrderContent() {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()
  const toast = useToastHelpers()
  const [user, setUser] = useState<any>(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    notes: ''
  })
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null)
  const [authStep, setAuthStep] = useState<'check' | 'login' | 'signup' | 'authenticated'>('check')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [authError, setAuthError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)
    
    // Add event listeners for online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    checkAuth()
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        setAuthStep('authenticated')
        
        // Pre-fill customer info from user profile
        setCustomerInfo(prev => ({
          ...prev,
          name: session.user.user_metadata?.full_name || '',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || ''
        }))

        // Load user's default location if available
        loadUserDefaultLocation(session.user.id)
      } else {
        setAuthStep('login')
      }
    } catch (error) {
      console.error('[AT RESTAURANT - Order] Auth check error:', error)
      setAuthStep('login')
    }
  }

  const loadUserDefaultLocation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('default_latitude, default_longitude, default_address, location_permissions_granted')
        .eq('id', userId)
        .single()

      if (error) {
        return
      }

      if (data?.default_latitude && data?.default_longitude) {
        const locationData: LocationData = {
          latitude: data.default_latitude,
          longitude: data.default_longitude,
          address: data.default_address || undefined,
          method: 'manual',
          timestamp: new Date().toISOString()
        }
        
        setDeliveryLocation(locationData)
      }
    } catch (error) {
      // Failed to load user location
    }
  }

  const handleLocationSelect = async (location: LocationData) => {
    setDeliveryLocation(location)

    // Save as user's default location if they're authenticated and location is valid
    if (user && location.latitude !== 0 && location.longitude !== 0) {
      try {
        await supabase
          .from('users')
          .update({
            default_latitude: location.latitude,
            default_longitude: location.longitude,
            default_address: location.address,
            location_permissions_granted: location.method === 'gps'
          })
          .eq('id', user.id)

      } catch (error) {
        // Could not save default location
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }))
    setAuthError('')
  }

  const validateAuthForm = () => {
    if (authStep === 'signup') {
      return customerInfo.name.trim() && 
             customerInfo.email.trim() && 
             customerInfo.phone.trim() &&
             customerInfo.password.length >= 6 &&
             customerInfo.password === customerInfo.confirmPassword
    }
    return customerInfo.email.trim() && customerInfo.password.trim()
  }

  const validateOrderForm = () => {
    return customerInfo.name.trim() && 
           customerInfo.email.trim() && 
           customerInfo.phone.trim() &&
           items.length > 0 &&
           user && // Must be authenticated
           deliveryLocation // Must have location
  }

  const handleLogin = async () => {
    if (!customerInfo.email.trim() || !customerInfo.password.trim()) {
      setAuthError('Please enter your email and password')
      return
    }

    setIsCreatingAccount(true)
    setAuthError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: customerInfo.email,
        password: customerInfo.password
      })

      if (error) {
        // If user doesn't exist, suggest signup
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('Account not found. Would you like to create a new account?')
          return
        }
        
        throw error
      }

      if (data.user) {
        setUser(data.user)
        setAuthStep('authenticated')
        
        // Update customer info with user data
        setCustomerInfo(prev => ({
          ...prev,
          name: data.user.user_metadata?.full_name || prev.name,
          email: data.user.email || prev.email,
          phone: data.user.user_metadata?.phone || prev.phone,
          password: '',
          confirmPassword: ''
        }))
      }
    } catch (error: any) {
      console.error('Login failed:', error)
      setAuthError(error.message || 'Login failed. Please try again.')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleSignup = async () => {
    if (!validateAuthForm()) {
      setAuthError('Please fill in all required fields and ensure passwords match (minimum 6 characters)')
      return
    }

    setIsCreatingAccount(true)
    setAuthError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: customerInfo.email,
        password: customerInfo.password,
        options: {
          data: {
            full_name: customerInfo.name,
            phone: customerInfo.phone
          }
        }
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Create user record in our users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: customerInfo.name,
            phone: customerInfo.phone
          })

        if (userError) {
          // User record creation warning, but continue
        }

        // If user is immediately confirmed (no email verification required)
        if (data.session) {
          setUser(data.user)
          setAuthStep('authenticated')
          setCustomerInfo(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }))
        } else {
          // Email confirmation required
          setAuthError('Please check your email and click the confirmation link, then try logging in.')
          setAuthStep('login')
        }
      }
    } catch (error: any) {
      console.error('Account creation failed:', error)
      setAuthError(error.message || 'Account creation failed. Please try again.')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const handleSubmitOrder = async () => {
    if (!validateOrderForm()) {
      if (!deliveryLocation) {
        toast.error('Location Required', 'Please set your delivery location before placing the order.')
      } else {
        toast.error('Form Incomplete', 'Please ensure you are logged in and all required fields are filled.')
      }
      return
    }

    if (!user) {
      toast.error('Login Required', 'You must be logged in to place an order.')
      setAuthStep('login')
      return
    }

    setIsSubmitting(true)

    try {
      const orderId = generateOrderId()
      
      const orderData = {
        id: orderId,
        user_id: user.id, // Always required now
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_amount: total,
        status: 'pending' as const,
        notes: customerInfo.notes || null,
        // Location data
        delivery_latitude: deliveryLocation?.latitude || null,
        delivery_longitude: deliveryLocation?.longitude || null,
        delivery_address: deliveryLocation?.address || null,
        location_method: deliveryLocation?.method || 'none',
        location_accuracy: deliveryLocation?.accuracy || null,
        location_timestamp: deliveryLocation?.timestamp || null,
        items: items.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          item_name: item.name
        }))
      }

      // Always store offline first for instant response
      await offlineUtils.storeOfflineOrder({
        ...orderData,
        created_at: new Date().toISOString(),
        synced: 0
      })

      // Clear cart immediately
      clearCart()

      if (isOnline) {
        try {
          // Try to submit to Supabase immediately
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              id: orderId,
              user_id: user.id, // Always required now
              customer_name: customerInfo.name,
              customer_email: customerInfo.email,
              customer_phone: customerInfo.phone,
              total_amount: total,
              status: 'pending',
              notes: customerInfo.notes || null,
              // Location data
              delivery_latitude: deliveryLocation?.latitude || null,
              delivery_longitude: deliveryLocation?.longitude || null,
              delivery_address: deliveryLocation?.address || null,
              location_method: deliveryLocation?.method || 'none',
              location_accuracy: deliveryLocation?.accuracy || null,
              location_timestamp: deliveryLocation?.timestamp || null
            })
            .select()
            .single()

          if (orderError) {
            throw orderError
          }

          // Insert order items
          const orderItems = items.map(item => ({
            order_id: orderId,
            menu_item_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity
          }))

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems)

          if (itemsError) {
            throw itemsError
          }

          // Create initial status log
          const { error: statusError } = await supabase
            .from('order_status_logs')
            .insert({
              order_id: orderId,
              status: 'pending',
              notes: 'Order placed successfully'
            })

          if (statusError) {
            // Don't throw here as the order was successful
          }

          // Mark as synced in offline storage
          await offlineUtils.markOrderSynced(orderId)

          toast.success('Order Placed Successfully!', 'Your order has been confirmed and is being prepared.')
          router.push(`/order-status?id=${orderId}`)
          
        } catch (supabaseError: any) {
          console.error('Immediate sync failed:', supabaseError)
          
          // Order is already stored offline, so just notify user
          toast.info('Order Saved Offline', 'Your order will be submitted when connection is restored.')
          router.push('/order-status')
        }
      } else {
        toast.info('Order Saved Offline', 'Your order will be submitted automatically when internet connection is restored.')
        router.push('/order-status')
      }
    } catch (error: any) {
      console.error('Order submission failed:', error)
      toast.error('Order Failed', error.message || 'Failed to save order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 pt-16">
        <div className="text-center max-w-lg mx-auto">
          <div className="icon-pink-light w-24 h-24 mx-auto mb-8">
            <ShoppingCart className="h-12 w-12 text-pink-primary" />
          </div>
          <h2 className="text-3xl font-bold text-dark mb-4">Your cart is empty</h2>
          <p className="text-muted-text mb-8 text-lg leading-relaxed">Add some delicious items from our menu to get started with your order.</p>
          <Link href="/menu">
            <Button className="btn-pink-primary px-8 py-4 text-lg font-semibold shadow-pink hover:shadow-pink-lg">
              Browse Menu
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-light pt-16">
      {/* Professional header */}
      <div className="bg-white shadow-clean border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Back Button and Breadcrumbs */}
          <div className="mb-4">
            <BackButton href="/menu" label="Back to Menu" />
          </div>
          <Breadcrumbs items={[{ label: 'Menu', href: '/menu' }, { label: 'Checkout' }]} className="mb-4" />
          
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-dark mb-2">Complete Your Order</h1>
            <p className="text-muted-text text-base sm:text-lg">Review your items and provide delivery details</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary - Professional Design */}
          <Card className="card-white">
            <CardHeader className="bg-pink-light border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div>
                  <CardTitle className="text-xl font-bold text-dark flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2 text-pink-primary" />
                    Order Summary
                  </CardTitle>
                  <p className="text-sm text-muted-text mt-1">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-pink-primary">{formatPrice(total)}</p>
                  <p className="text-sm text-muted-text">Total Amount</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-border hover:shadow-clean transition-all">
                    <div className="w-16 h-16 bg-gray-light rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {item.image_url ? (
                        <ImageWithModal
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full bg-pink-light flex items-center justify-center">
                          <span className="text-muted-text text-xs font-medium">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-dark truncate text-base">{item.name}</h3>
                      <p className="text-muted-text text-sm">{formatPrice(item.price)} each</p>
                    </div>

                    <div className="flex items-center space-x-3 bg-white rounded-lg border border-border p-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 rounded-md hover:bg-pink-light"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 rounded-md hover:bg-pink-light"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-right flex-shrink-0 min-w-0">
                      <p className="font-bold text-dark text-base">{formatPrice(item.price * item.quantity)}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="text-pink-primary hover:text-pink-primary hover:bg-pink-light p-1 h-auto mt-1 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6 mt-6">
                <div className="bg-pink-light rounded-xl p-4 border border-pink-primary/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-lg font-semibold text-dark">Total Amount</span>
                      <p className="text-sm text-muted-text">Including all items</p>
                    </div>
                    <span className="text-3xl font-bold text-pink-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Customer Information - Professional Design */}
          <Card className="card-white sticky top-24">
            <CardHeader className="bg-pink-light border-b border-border">
              <CardTitle className="flex items-center text-lg font-bold text-dark">
                {authStep === 'authenticated' ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    <span>Delivery Information</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2 text-pink-primary" />
                    <span>Account Required</span>
                  </>
                )}
              </CardTitle>
              {user && (
                <p className="text-sm text-green-600 flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Signed in as {user.email}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {authStep === 'check' && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-primary"></div>
                  <span className="ml-3 text-muted-text">Checking authentication...</span>
                </div>
              )}

              {authStep === 'login' && (
                <div className="space-y-6">
                  <div className="bg-pink-light border border-pink-primary/20 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <Lock className="h-5 w-5 text-pink-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-dark">Account Required</h4>
                        <p className="text-sm text-muted-text mt-1">
                          Sign in to your account or create a new one to place your order.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Password *
                      </label>
                      <Input
                        type="password"
                        value={customerInfo.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Enter your password"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    {authError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <p className="text-red-800 text-sm font-medium">{authError}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Button
                        onClick={handleLogin}
                        disabled={isCreatingAccount}
                        className="btn-pink-primary w-full h-12 text-base font-semibold shadow-pink hover:shadow-pink-lg"
                      >
                        {isCreatingAccount ? 'Signing In...' : 'Sign In'}
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-white text-muted-text font-medium">Don't have an account?</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => setAuthStep('signup')}
                        variant="outline"
                        className="w-full h-12 text-base font-semibold rounded-xl border-2 border-border hover:border-pink-primary hover:text-pink-primary"
                      >
                        Create New Account
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {authStep === 'signup' && (
                <div className="space-y-6">
                  <div className="bg-pink-light border border-pink-primary/20 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <User className="h-5 w-5 text-pink-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-dark">Create Your Account</h4>
                        <p className="text-sm text-muted-text mt-1">
                          Create an account to place your order and track it easily.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Full Name *
                      </label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Password * (minimum 6 characters)
                      </label>
                      <Input
                        type="password"
                        value={customerInfo.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Create a password"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Confirm Password *
                      </label>
                      <Input
                        type="password"
                        value={customerInfo.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm your password"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    {authError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <p className="text-red-800 text-sm font-medium">{authError}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Button
                        onClick={handleSignup}
                        disabled={isCreatingAccount}
                        className="btn-pink-primary w-full h-12 text-base font-semibold shadow-pink hover:shadow-pink-lg"
                      >
                        {isCreatingAccount ? 'Creating Account...' : 'Create Account & Continue'}
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-white text-muted-text font-medium">Already have an account?</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => setAuthStep('login')}
                        variant="outline"
                        className="w-full h-12 text-base font-semibold rounded-xl border-2 border-border hover:border-pink-primary hover:text-pink-primary"
                      >
                        Sign In Instead
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {authStep === 'authenticated' && (
                <div className="space-y-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Full Name *
                      </label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter your full name"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter your email"
                        className="input-clean h-12 text-base bg-gray-light"
                        required
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter your phone number"
                        className="input-clean h-12 text-base"
                        required
                      />
                    </div>

                    {/* Location Picker */}
                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3 flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Delivery Location *
                      </label>
                      <div className="border-2 border-border rounded-xl p-4 bg-gray-light">
                        <LocationPicker
                          onLocationSelect={handleLocationSelect}
                          initialLocation={deliveryLocation}
                          required={true}
                          showMap={true}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark mb-3">
                        Special Instructions (Optional)
                      </label>
                      <textarea
                        value={customerInfo.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Any special requests or dietary restrictions?"
                        className="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-0 focus:border-pink-primary text-base resize-none bg-white"
                        rows={4}
                      />
                    </div>
                  </div>

                  {/* Submit Button - Professional Design */}
                  <div className="pt-6 border-t border-border">
                    <Button
                      onClick={handleSubmitOrder}
                      disabled={!validateOrderForm() || isSubmitting}
                      className="btn-pink-primary w-full h-16 text-lg font-bold shadow-pink hover:shadow-pink-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" variant="white" className="mr-3" />
                          Placing Order...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <CreditCard className="h-6 w-6 mr-3" />
                          Place Order - {formatPrice(total)}
                        </div>
                      )}
                    </Button>
                    
                    {!isOnline && (
                      <div className="mt-4 p-3 bg-pink-light border border-pink-primary/20 rounded-lg">
                        <p className="text-sm text-pink-primary text-center font-medium">
                          Your order will be submitted when internet connection is restored.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent />
    </Suspense>
  )
}