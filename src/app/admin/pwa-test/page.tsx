'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function PWATestPage() {
  const [serviceWorkers, setServiceWorkers] = useState<any[]>([])
  const [manifests, setManifests] = useState<any>({})
  const [installState, setInstallState] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPWAStatus()
  }, [])

  const checkPWAStatus = async () => {
    setLoading(true)
    
    // Check service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      setServiceWorkers(registrations.map(reg => ({
        scope: reg.scope,
        active: reg.active?.scriptURL || 'None',
        state: reg.active?.state || 'None',
        waiting: reg.waiting?.scriptURL || 'None',
        installing: reg.installing?.scriptURL || 'None'
      })))
    }

    // Check manifests
    const manifestLinks = document.querySelectorAll('link[rel="manifest"]')
    const manifestData: any = {}
    
    for (const link of manifestLinks) {
      const href = (link as HTMLLinkElement).href
      try {
        const response = await fetch(href)
        const data = await response.json()
        manifestData[href] = data
      } catch (error) {
        manifestData[href] = { error: 'Failed to load' }
      }
    }
    
    setManifests(manifestData)

    // Check installation state
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const userInstalled = localStorage.getItem('pwa-installed') === 'true'
    const adminInstalled = localStorage.getItem('admin-pwa-installed') === 'true'
    const userPromptSeen = localStorage.getItem('pwa-install-prompt-seen') === 'true'
    const adminPromptSeen = localStorage.getItem('admin-pwa-install-prompt-seen') === 'true'

    setInstallState({
      isStandalone,
      userInstalled,
      adminInstalled,
      userPromptSeen,
      adminPromptSeen,
      isHTTPS: window.location.protocol === 'https:',
      currentURL: window.location.href
    })

    setLoading(false)
  }

  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      alert('All caches cleared!')
      checkPWAStatus()
    }
  }

  const unregisterServiceWorkers = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
      alert('All service workers unregistered!')
      checkPWAStatus()
    }
  }

  const resetInstallState = () => {
    localStorage.removeItem('pwa-installed')
    localStorage.removeItem('admin-pwa-installed')
    localStorage.removeItem('pwa-install-prompt-seen')
    localStorage.removeItem('admin-pwa-install-prompt-seen')
    localStorage.removeItem('pwa-ios-install-prompt-seen')
    localStorage.removeItem('admin-pwa-ios-install-prompt-seen')
    alert('Install state reset!')
    checkPWAStatus()
  }

  const StatusIcon = ({ status }: { status: boolean }) => (
    status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PWA Test & Debug</h1>
          <p className="text-gray-600 mt-1">Check PWA installation status and debug issues</p>
        </div>
        <Button onClick={checkPWAStatus} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Installation State */}
      <Card>
        <CardHeader>
          <CardTitle>Installation State</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Running in Standalone Mode</span>
              <StatusIcon status={installState.isStandalone} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">HTTPS Enabled</span>
              <StatusIcon status={installState.isHTTPS} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">User App Installed</span>
              <StatusIcon status={installState.userInstalled} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Admin App Installed</span>
              <StatusIcon status={installState.adminInstalled} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">User Prompt Seen</span>
              <StatusIcon status={installState.userPromptSeen} />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Admin Prompt Seen</span>
              <StatusIcon status={installState.adminPromptSeen} />
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-900">Current URL:</span>
              <p className="text-sm text-blue-700 mt-1 break-all">{installState.currentURL}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Workers */}
      <Card>
        <CardHeader>
          <CardTitle>Service Workers ({serviceWorkers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceWorkers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No service workers registered</p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceWorkers.map((sw, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Scope:</span>
                    <p className="text-sm text-gray-600 break-all">{sw.scope}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Active:</span>
                    <p className="text-sm text-gray-600 break-all">{sw.active}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">State:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      sw.state === 'activated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sw.state}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manifests */}
      <Card>
        <CardHeader>
          <CardTitle>Manifests ({Object.keys(manifests).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(manifests).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No manifests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(manifests).map(([url, data]: [string, any]) => (
                <div key={url} className="p-4 bg-gray-50 rounded-lg">
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">URL:</span>
                    <p className="text-sm text-gray-600 break-all">{url}</p>
                  </div>
                  {data.error ? (
                    <p className="text-sm text-red-600">{data.error}</p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {data.name}</p>
                      <p><span className="font-medium">Start URL:</span> {data.start_url}</p>
                      <p><span className="font-medium">Scope:</span> {data.scope || '/'}</p>
                      <p><span className="font-medium">Theme:</span> {data.theme_color}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              onClick={resetInstallState} 
              variant="outline" 
              className="w-full"
            >
              Reset Install State
            </Button>
            <Button 
              onClick={clearCache} 
              variant="outline" 
              className="w-full"
            >
              Clear All Caches
            </Button>
            <Button 
              onClick={unregisterServiceWorkers} 
              variant="destructive" 
              className="w-full"
            >
              Unregister All Service Workers
            </Button>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> These actions will reset your PWA installation. 
              You'll need to reinstall the apps after using these tools.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
