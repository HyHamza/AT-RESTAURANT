'use client'

import { ArrowLeft, Shield, Eye, Database, Cookie, Mail, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="ghost" size="sm" className="text-muted-text hover:text-pink-primary w-full sm:w-auto h-12 text-base">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-pink-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-dark">Privacy Policy</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="card-white p-6 sm:p-8">
          {/* Last Updated */}
          <div className="flex items-center space-x-2 text-sm text-muted-text mb-6 sm:mb-8">
            <Eye className="h-4 w-4" />
            <span>Last updated: January 31, 2026</span>
          </div>

          {/* Introduction */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-dark mb-4">Your Privacy Matters</h2>
            <p className="text-muted-text leading-relaxed text-sm sm:text-base">
              At AT RESTAURANT, we are committed to protecting your privacy and ensuring the security 
              of your personal information. This Privacy Policy explains how we collect, use, and 
              safeguard your data when you use our services.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6 sm:space-y-8">
            {/* Information We Collect */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold text-dark mb-3 flex items-center">
                <div className="icon-pink-light w-6 h-6 mr-2 flex-shrink-0">
                  <span className="text-pink-primary text-sm font-bold">1</span>
                </div>
                Information We Collect
              </h3>
              <div className="text-muted-text space-y-4 ml-8">
                <div>
                  <h4 className="font-medium text-dark mb-2 text-sm sm:text-base">Personal Information</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Name, email address, and phone number</li>
                    <li>Delivery addresses and location data</li>
                    <li>Payment information (processed securely by third parties)</li>
                    <li>Account preferences and settings</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-dark mb-2 text-sm sm:text-base">Usage Information</h4>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                    <li>Order history and preferences</li>
                    <li>Website and app usage patterns</li>
                    <li>Device information and IP address</li>
                    <li>Location data (with your permission)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">2</span>
                </div>
                How We Use Your Information
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>We use your information to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Process and fulfill your food orders</li>
                  <li>Provide customer support and communicate with you</li>
                  <li>Improve our services and user experience</li>
                  <li>Send order updates and promotional offers (with consent)</li>
                  <li>Ensure security and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            {/* Location Data */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">3</span>
                </div>
                Location Data
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  We may collect location information to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Provide accurate delivery services</li>
                  <li>Show nearby restaurant locations</li>
                  <li>Estimate delivery times</li>
                  <li>Improve our delivery routes</li>
                </ul>
                <p className="text-sm bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                  <AlertTriangle className="h-4 w-4 text-blue-600 inline mr-2" />
                  You can disable location services at any time through your device settings.
                </p>
              </div>
            </section>

            {/* Information Sharing */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">4</span>
                </div>
                Information Sharing
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>We may share your information with:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Delivery partners to fulfill your orders</li>
                  <li>Payment processors for secure transactions</li>
                  <li>Service providers who assist our operations</li>
                  <li>Legal authorities when required by law</li>
                </ul>
                <p className="text-sm font-medium text-gray-900 mt-3">
                  We do not sell your personal information to third parties.
                </p>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">5</span>
                </div>
                Data Security
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>We protect your information through:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Encryption of sensitive data in transit and at rest</li>
                  <li>Secure servers and regular security updates</li>
                  <li>Access controls and employee training</li>
                  <li>Regular security audits and monitoring</li>
                </ul>
              </div>
            </section>

            {/* Cookies and Tracking */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <Cookie className="h-4 w-4 text-orange-600" />
                </div>
                Cookies and Tracking
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Remember your preferences and login status</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Provide personalized content and recommendations</li>
                  <li>Enable social media features</li>
                </ul>
                <p className="text-sm text-gray-600 mt-3">
                  You can control cookie settings through your browser preferences.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">6</span>
                </div>
                Your Rights
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Access and review your personal information</li>
                  <li>Correct inaccurate or incomplete data</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Request data portability</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <Database className="h-4 w-4 text-orange-600" />
                </div>
                Data Retention
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  We retain your personal information only as long as necessary to provide our services 
                  and comply with legal obligations. Order history may be retained for accounting and 
                  customer service purposes.
                </p>
              </div>
            </section>

            {/* Children's Privacy */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">7</span>
                </div>
                Children's Privacy
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  Our services are not intended for children under 13 years of age. 
                  We do not knowingly collect personal information from children under 13.
                </p>
              </div>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-sm font-bold">8</span>
                </div>
                Changes to This Policy
              </h3>
              <div className="text-gray-700 space-y-3 ml-8">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any 
                  material changes by posting the new policy on our website and updating the 
                  "Last updated" date.
                </p>
              </div>
            </section>
          </div>

          {/* Contact Information */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
            <div className="bg-pink-light rounded-lg p-4 sm:p-6">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-pink-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-dark mb-2 text-sm sm:text-base">Privacy Questions or Concerns?</h4>
                  <p className="text-muted-text text-sm mb-3">
                    If you have any questions about this Privacy Policy or how we handle your data, 
                    please contact us:
                  </p>
                  <div className="text-sm text-muted-text space-y-1">
                    <p>Email: privacy@atrestaurant.pk</p>
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