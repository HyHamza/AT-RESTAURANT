// Location Service for AT RESTAURANT
// Handles GPS detection, address geocoding, and location storage

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string
  method: 'gps' | 'manual' | 'none'
  timestamp: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  formattedAddress: string
  components: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
}

class LocationService {
  private watchId: number | null = null

  /**
   * Get user's current GPS location
   */
  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000 // 5 minutes
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            method: 'gps',
            timestamp: new Date().toISOString()
          }
          resolve(locationData)
        },
        (error) => {
          let errorMessage = 'Failed to get location'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          
          reject(new Error(errorMessage))
        },
        options
      )
    })
  }

  /**
   * Watch user's location for continuous updates
   */
  watchLocation(callback: (location: LocationData) => void, errorCallback: (error: Error) => void): number | null {
    if (!navigator.geolocation) {
      errorCallback(new Error('Geolocation is not supported'))
      return null
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000 // 1 minute
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          method: 'gps',
          timestamp: new Date().toISOString()
        }
        callback(locationData)
      },
      (error) => {
        errorCallback(new Error(`Location watch error: ${error.message}`))
      },
      options
    )

    return this.watchId
  }

  /**
   * Stop watching location
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey || apiKey === 'apii-ki') {
      // Fallback: Use a simple geocoding service or return approximate coordinates
      throw new Error('Google Maps API key not configured. Please add your API key to use address geocoding.')
    }

    try {
      const encodedAddress = encodeURIComponent(address)
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
      )

      if (!response.ok) {
        throw new Error('Geocoding request failed')
      }

      const data = await response.json()

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error('Address not found')
      }

      const result = data.results[0]
      const location = result.geometry.location
      
      // Extract address components
      const components: GeocodeResult['components'] = {}
      result.address_components?.forEach((component: any) => {
        const types = component.types
        if (types.includes('street_number') || types.includes('route')) {
          components.street = (components.street || '') + ' ' + component.long_name
        } else if (types.includes('locality')) {
          components.city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          components.state = component.long_name
        } else if (types.includes('country')) {
          components.country = component.long_name
        } else if (types.includes('postal_code')) {
          components.postalCode = component.long_name
        }
      })

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
        components
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      throw new Error('Failed to geocode address')
    }
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      // Fallback: Return coordinates as string
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      )

      if (!response.ok) {
        throw new Error('Reverse geocoding request failed')
      }

      const data = await response.json()

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      }

      return data.results[0].formatted_address
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }
  }

  /**
   * Check if location permissions are granted
   */
  async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!navigator.permissions) {
      return 'unsupported'
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      return permission.state as 'granted' | 'denied' | 'prompt'
    } catch (error) {
      return 'unsupported'
    }
  }

  /**
   * Format location for display
   */
  formatLocation(location: LocationData): string {
    if (location.address) {
      return location.address
    }
    
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Generate Google Maps URL for coordinates
   */
  generateMapsUrl(latitude: number, longitude: number, zoom: number = 15): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}`
  }

  /**
   * Generate Google Maps directions URL
   */
  generateDirectionsUrl(
    fromLat: number, 
    fromLon: number, 
    toLat: number, 
    toLon: number
  ): string {
    return `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`
  }
}

// Export singleton instance
export const locationService = new LocationService()

// Export utility functions
export const LocationUtils = {
  isValidCoordinate: (lat: number, lon: number): boolean => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  },
  
  formatCoordinates: (lat: number, lon: number, precision: number = 6): string => {
    return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`
  },
  
  parseCoordinates: (coordString: string): { lat: number; lon: number } | null => {
    const parts = coordString.split(',').map(s => s.trim())
    if (parts.length !== 2) return null
    
    const lat = parseFloat(parts[0])
    const lon = parseFloat(parts[1])
    
    if (isNaN(lat) || isNaN(lon)) return null
    if (!LocationUtils.isValidCoordinate(lat, lon)) return null
    
    return { lat, lon }
  }
}