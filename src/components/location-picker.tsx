'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Search,
  ExternalLink
} from 'lucide-react'
import { locationService, LocationData, GeocodeResult } from '@/lib/location-service'

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void
  initialLocation?: LocationData | null
  required?: boolean
  showMap?: boolean
}

export function LocationPicker({ 
  onLocationSelect, 
  initialLocation, 
  required = false,
  showMap = true 
}: LocationPickerProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(initialLocation || null)
  const [manualAddress, setManualAddress] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt' | 'unsupported'>('unknown')
  const [locationMethod, setLocationMethod] = useState<'auto' | 'manual'>('auto')

  useEffect(() => {
    checkLocationPermission()
    if (initialLocation) {
      setCurrentLocation(initialLocation)
      if (initialLocation.address) {
        setManualAddress(initialLocation.address)
      }
    }
  }, [initialLocation])

  const checkLocationPermission = async () => {
    try {
      const permission = await locationService.checkLocationPermission()
      setPermissionStatus(permission)
    } catch (error) {
      setPermissionStatus('unknown')
    }
  }

  const detectLocation = async () => {
    setIsDetecting(true)
    setError(null)

    try {
      const location = await locationService.getCurrentLocation()
      
      // Try to get address from coordinates
      try {
        const address = await locationService.reverseGeocode(location.latitude, location.longitude)
        location.address = address
        setManualAddress(address)
      } catch (geocodeError) {
        console.error('Could not resolve address from coordinates:', geocodeError)
        location.address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
        setManualAddress(location.address)
      }

      setCurrentLocation(location)
      onLocationSelect(location)
      setPermissionStatus('granted')
      
    } catch (error: any) {
      console.error('[AT RESTAURANT - Location] ✗ GPS detection failed:', error)
      setError(error.message)
      
      if (error.message.includes('denied')) {
        setPermissionStatus('denied')
        setLocationMethod('manual')
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const geocodeManualAddress = async () => {
    if (!manualAddress.trim()) {
      setError('Please enter an address')
      return
    }

    setIsGeocoding(true)
    setError(null)

    try {
      const result = await locationService.geocodeAddress(manualAddress.trim())
      
      const location: LocationData = {
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.formattedAddress,
        method: 'manual',
        timestamp: new Date().toISOString()
      }

      setCurrentLocation(location)
      setManualAddress(result.formattedAddress)
      onLocationSelect(location)
      
    } catch (error: any) {
      console.error('Geocoding failed:', error)
      
      // If geocoding fails, still allow manual address entry
      const location: LocationData = {
        latitude: 0,
        longitude: 0,
        address: manualAddress.trim(),
        method: 'manual',
        timestamp: new Date().toISOString()
      }
      
      setCurrentLocation(location)
      onLocationSelect(location)
      setError('Could not find exact coordinates for this address, but it will be saved as entered.')
    } finally {
      setIsGeocoding(false)
    }
  }

  const clearLocation = () => {
    setCurrentLocation(null)
    setManualAddress('')
    setError(null)
    onLocationSelect({
      latitude: 0,
      longitude: 0,
      method: 'none',
      timestamp: new Date().toISOString()
    })
  }

  const openInMaps = () => {
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      const url = locationService.generateMapsUrl(currentLocation.latitude, currentLocation.longitude)
      window.open(url, '_blank')
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
          <span>Delivery Location {required && '*'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Method Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={locationMethod === 'auto' ? 'default' : 'outline'}
            onClick={() => setLocationMethod('auto')}
            className="w-full text-sm sm:text-base h-10 sm:h-11"
            disabled={permissionStatus === 'denied'}
          >
            <Navigation className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="truncate">Auto-Detect</span>
          </Button>
          <Button
            variant={locationMethod === 'manual' ? 'default' : 'outline'}
            onClick={() => setLocationMethod('manual')}
            className="w-full text-sm sm:text-base h-10 sm:h-11"
          >
            <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="truncate">Enter Address</span>
          </Button>
        </div>

        {/* Auto-Detection Section */}
        {locationMethod === 'auto' && (
          <div className="space-y-3">
            {permissionStatus === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs sm:text-sm">
                    <p className="text-red-800 font-medium">Location Access Denied</p>
                    <p className="text-red-700 mt-1">
                      Please enable location access in your browser settings or enter your address manually.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {permissionStatus !== 'denied' && (
              <Button
                onClick={detectLocation}
                disabled={isDetecting}
                className="w-full bg-orange-500 hover:bg-orange-600 h-11 sm:h-12 text-sm sm:text-base"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Detecting Location...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    <span>Detect My Location</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Manual Address Section */}
        {locationMethod === 'manual' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Delivery Address {required && '*'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  onKeyPress={(e) => e.key === 'Enter' && geocodeManualAddress()}
                  className="flex-1 h-11 text-sm sm:text-base"
                />
                <Button
                  onClick={geocodeManualAddress}
                  disabled={isGeocoding || !manualAddress.trim()}
                  variant="outline"
                  className="h-11 px-4 sm:px-6"
                >
                  {isGeocoding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-800 text-xs sm:text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Current Location Display */}
        {currentLocation && (currentLocation.latitude !== 0 || currentLocation.longitude !== 0) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start space-x-2 flex-1 min-w-0">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm min-w-0 flex-1">
                  <p className="text-green-800 font-medium">Location Set</p>
                  <p className="text-green-700 break-words">
                    {currentLocation.address || `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`}
                  </p>
                  {currentLocation.method === 'gps' && currentLocation.accuracy && (
                    <p className="text-green-600 text-xs mt-1">
                      GPS accuracy: ±{Math.round(currentLocation.accuracy)}m
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 flex-shrink-0">
                {currentLocation.latitude !== 0 && currentLocation.longitude !== 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openInMaps}
                    className="text-xs h-8"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span>View</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearLocation}
                  className="text-xs h-8"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Location Info */}
        <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
          <p>• Your location helps us provide accurate delivery estimates</p>
          <p>• GPS location is more accurate than manual address entry</p>
          <p>• Your location data is stored securely and only used for delivery</p>
        </div>
      </CardContent>
    </Card>
  )
}