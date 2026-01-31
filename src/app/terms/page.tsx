'use client'

import { ArrowLeft, FileText, Shield, AlertCircle, Clock, Mail } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Last Updated */}
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
            <Clock className="h-4 w-4" />
            <span>Last updated: January 31, 2026</span>
          </div>

          {/* Introduction */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to AT RESTAURANT</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms of Service govern your use of the AT RESTAURANT website and mobile application. 
              By accessing or using our services, you agree to be bound by these terms.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8">
            {/* Service Description */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">1</span>
                </div>
                Service Description
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  AT RESTAURANT provides an online food ordering platform that allows customers to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Browse our menu and place food orders</li>
                  <li>Track order status in real-time</li>
                  <li>Manage delivery preferences and locations</li>
                  <li>Access order history and receipts</li>
                </ul>
              </div>
            </section>

            {/* User Accounts */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">2</span>
                </div>
                User Accounts
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  You may create an account to access additional features. You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>Providing accurate and current information</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                </ul>
              </div>
            </section>

            {/* Orders and Payment */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">3</span>
                </div>
                Orders and Payment
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  When placing an order through our platform:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>All orders are subject to availability and acceptance</li>
                  <li>Prices are subject to change without notice</li>
                  <li>Payment is required at the time of order placement</li>
                  <li>We reserve the right to refuse or cancel orders</li>
                </ul>
              </div>
            </section>

            {/* Delivery and Pickup */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">4</span>
                </div>
                Delivery and Pickup
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  For delivery and pickup services:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Delivery times are estimates and may vary</li>
                  <li>Accurate delivery information must be provided</li>
                  <li>Additional charges may apply for delivery</li>
                  <li>You must be available to receive your order</li>
                </ul>
              </div>
            </section>

            {/* User Conduct */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">5</span>
                </div>
                User Conduct
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  You agree not to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use the service for any unlawful purpose</li>
                  <li>Interfere with or disrupt the service</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Provide false or misleading information</li>
                </ul>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">6</span>
                </div>
                Intellectual Property
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  All content on our platform, including text, graphics, logos, and software, 
                  is the property of AT RESTAURANT and is protected by intellectual property laws.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">7</span>
                </div>
                Limitation of Liability
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  AT RESTAURANT shall not be liable for any indirect, incidental, special, 
                  or consequential damages arising from your use of our services.
                </p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">8</span>
                </div>
                Changes to Terms
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  We reserve the right to modify these terms at any time. 
                  Changes will be effective immediately upon posting on our website.
                </p>
              </div>
            </section>
          </div>

          {/* Contact Information */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Questions about these terms?</h4>
                  <p className="text-gray-700 text-sm mb-3">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Email: info@atrestaurant.pk</p>
                    <p>Phone: +92 41 123 4567</p>
                    <p>Address: Kotwali Road, Faisalabad, Punjab, Pakistan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}