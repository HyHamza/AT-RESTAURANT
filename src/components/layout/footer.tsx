'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Phone, Mail, Clock, UtensilsCrossed } from 'lucide-react'

export function Footer() {
  const pathname = usePathname()
  const isAdminPage = pathname.startsWith('/admin')

  if (isAdminPage) {
    return null
  }

  return (
    <footer className="bg-gray-light text-dark border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-pink" style={{ background: 'linear-gradient(135deg, hsl(337, 80%, 50%) 0%, hsl(337, 80%, 60%) 100%)' }}>
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-dark">AT RESTAURANT</span>
            </div>
            <p className="mb-4 max-w-md" style={{ color: 'hsl(330, 23%, 26%)' }}>
              Experience the finest dining with our carefully crafted menu featuring premium, 
              locally-sourced ingredients and exceptional flavors.
            </p>
            <div className="mt-6 mb-6 max-w-xs h-px" style={{ background: 'linear-gradient(to right, hsl(337, 80%, 50%), transparent)' }}></div>
            <p className="text-sm font-medium" style={{ color: 'hsl(337, 80%, 50%)' }}>Fresh Food, Fast Delivery</p>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-dark">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(337, 100%, 98%)' }}>
                  <MapPin className="h-4 w-4" style={{ color: 'hsl(337, 80%, 50%)' }} />
                </div>
                <span className="text-sm" style={{ color: 'hsl(330, 23%, 26%)' }}>Kotwali Road, Faisalabad, Punjab, Pakistan</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(337, 100%, 98%)' }}>
                  <Phone className="h-4 w-4" style={{ color: 'hsl(337, 80%, 50%)' }} />
                </div>
                <span className="text-sm" style={{ color: 'hsl(330, 23%, 26%)' }}>+92 41 123 4567</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(337, 100%, 98%)' }}>
                  <Mail className="h-4 w-4" style={{ color: 'hsl(337, 80%, 50%)' }} />
                </div>
                <span className="text-sm" style={{ color: 'hsl(330, 23%, 26%)' }}>info@atrestaurant.pk</span>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-dark">Hours</h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mt-0.5" style={{ background: 'hsl(337, 100%, 98%)' }}>
                  <Clock className="h-4 w-4" style={{ color: 'hsl(337, 80%, 50%)' }} />
                </div>
                <div className="text-sm" style={{ color: 'hsl(330, 23%, 26%)' }}>
                  <div>Mon-Thu: 11AM-10PM</div>
                  <div>Fri-Sat: 11AM-11PM</div>
                  <div>Sunday: 12PM-9PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 mb-8 h-px" style={{ background: 'hsl(0, 0%, 93%)' }}></div>

        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm" style={{ color: 'hsl(330, 23%, 26%)' }}>
            © 2026 AT RESTAURANT. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link 
              href="/privacy" 
              className="text-sm transition-colors hover:underline"
              style={{ color: 'hsl(337, 80%, 50%)' }}
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-sm transition-colors hover:underline"
              style={{ color: 'hsl(337, 80%, 50%)' }}
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
