'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, ArrowRight, Check, UtensilsCrossed } from 'lucide-react'
import { AuthSkeleton } from '@/components/skeletons/auth-skeleton'

function SignupForm() {
  const [step, setStep] = useState<'email' | 'details'>('email')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromCheckout = searchParams.get('from') === 'checkout'

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email.trim()) {
      setError('Email is required')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }
    setError('')
    setStep('details')
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone
          }
        }
      })

      if (error) {
        console.error('[AT RESTAURANT - Auth] Signup error:', error)
        throw error
      }

      if (data.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: formData.fullName,
            phone: formData.phone
          })

        if (userError) {
          console.error('Failed to create user record:', userError)
        }

        if (data.session) {
          if (fromCheckout) {
            router.push('/order')
          } else {
            router.push('/dashboard')
          }
        } else {
          setError('Please check your email and click the confirmation link to complete your registration.')
        }
      }
    } catch (error: any) {
      console.error('[AT RESTAURANT - Auth] Signup failed:', error)
      setError(error.message || 'Signup failed. Please try again.')
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
            onClick={() => step === 'details' ? setStep('email') : router.back()}
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
              {step === 'email' ? 'Create your account' : 'Complete your profile'}
            </CardTitle>
            <p className="text-muted-text text-sm">
              {step === 'email' 
                ? 'Enter your email to get started' 
                : 'Just a few more details'
              }
            </p>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-8">
            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
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

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  </div>
                )}

                {/* Continue Button */}
                <Button
                  type="submit"
                  className="w-full btn-pink-primary h-14 text-base font-semibold"
                >
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                {/* Email Display (Read-only) */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-text">Email</p>
                      <p className="text-sm text-dark font-medium">{formData.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-xs link-pink transition-colors"
                  >
                    Change
                  </button>
                </div>

                {/* Full Name Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="John Doe"
                      className="pl-11 pr-4 h-12 text-base border border-gray-300 rounded-lg focus:border-pink-primary focus:ring-2 focus:ring-pink-primary/10 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="pl-11 pr-4 h-12 text-base border border-gray-300 rounded-lg focus:border-pink-primary focus:ring-2 focus:ring-pink-primary/10 transition-all"
                      required
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
                      placeholder="Create a strong password"
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

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your password"
                      className="pl-11 pr-12 h-12 text-base border border-gray-300 rounded-lg focus:border-pink-primary focus:ring-2 focus:ring-pink-primary/10 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-primary transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className={`rounded-xl p-4 ${
                    error.includes('check your email') 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          error.includes('check your email')
                            ? 'bg-blue-100'
                            : 'bg-red-100'
                        }`}>
                          <span className={`text-sm font-bold ${
                            error.includes('check your email')
                              ? 'text-blue-600'
                              : 'text-red-600'
                          }`}>
                            {error.includes('check your email') ? '✓' : '!'}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm flex-1 ${
                        error.includes('check your email')
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`}>{error}</p>
                    </div>
                  </div>
                )}

                {/* Signup Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-pink-primary h-14 text-base font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner-pink h-5 w-5 mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Divider - Only show on email step */}
            {step === 'email' && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full divider-light"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-muted-text font-medium">Already have an account?</span>
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center">
                  <Link 
                    href={`/login${fromCheckout ? '?from=checkout' : ''}`}
                    className="inline-flex items-center link-pink font-semibold text-base group"
                  >
                    Sign in to your account
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer - Only show on email step */}
        {step === 'email' && (
          <div className="text-center mt-8 text-sm text-muted-text">
            <p>© 2026 AT RESTAURANT. Fresh Food, Fast Delivery</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <SignupForm />
    </Suspense>
  )
}
