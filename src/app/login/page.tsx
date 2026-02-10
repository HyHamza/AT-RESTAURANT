'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, ArrowLeft, ArrowRight, UtensilsCrossed, ShieldCheck, AlertCircle } from 'lucide-react'
import { AuthSkeleton } from '@/components/skeletons/auth-skeleton'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const fromCheckout = searchParams.get('from') === 'checkout'

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) {
        console.error('[AT RESTAURANT - Auth] Login error:', error)
        throw error
      }

      if (data.user) {
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email!,
            full_name: data.user.user_metadata?.full_name || '',
            phone: data.user.user_metadata?.phone || ''
          })

        if (userError) {
          console.error('Failed to create user record:', userError)
        }

        if (fromCheckout) {
          router.push('/order')
        } else {
          router.push(redirectTo)
        }
      }
    } catch (error: any) {
      console.error('[AT RESTAURANT - Auth] Login failed:', error)
      setError(error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-muted-text hover:text-pink-primary hover:bg-pink-light transition-smooth group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>
        </div>

        <Card className="card-white">
          <CardHeader className="text-center pb-6 px-6 sm:px-8 pt-10">
            {/* Logo */}
            <div className="icon-pink w-16 h-16 mx-auto mb-6">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-dark mb-2 heading-clean">
              Welcome Back
            </CardTitle>
            <p className="text-muted-text text-sm">
              {fromCheckout 
                ? 'Sign in to complete your order' 
                : 'Continue your culinary journey'
              }
            </p>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="you@example.com"
                    className="pl-11 pr-4 h-12 text-base border border-gray-300 rounded-lg focus:border-pink-primary focus:ring-2 focus:ring-pink-primary/10 transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    className="pl-11 pr-12 h-12 text-base border border-gray-300 rounded-lg focus:border-pink-primary focus:ring-2 focus:ring-pink-primary/10 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center shadow-sm">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-700 text-sm font-medium leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full btn-pink-primary h-14 text-base font-semibold"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" variant="white" className="mr-2" />
                    Signing In...
                  </div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full divider-light"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-muted-text font-medium">New to AT Restaurant?</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link 
                href={`/signup${fromCheckout ? '?from=checkout' : ''}`}
                className="inline-flex items-center link-pink font-semibold text-base group"
              >
                Create a new account
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Guest Checkout Option */}
            {fromCheckout && (
              <div className="mt-6 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => router.push('/order')}
                  className="w-full btn-white-outline h-12 text-base"
                >
                  Continue as Guest
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-text">
          <p>© 2026 AT RESTAURANT. Fresh Food, Fast Delivery</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
