/**
 * Enhanced Location Service with Offline Support
 * Manages user delivery locations with automatic saving and retrieval
 */

import { supabase } from './supabase'
import { locationManager, type SavedLocation } from './offline-db'

export interface DeliveryLocation {
  id?: string
  addressLine1: string
  addressLine2?: string
  city?: string
  postalCode?: string
  latitude: number
  longitude: number
  isPrimary?: boolean
}

export interface LocationWithMetadata extends DeliveryLocation {
  id: string
  lastUsedAt: Date
  createdAt: Date
}

export class LocationService {
  private static instance: LocationService

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  /**
   * Get last used location for user
   * Tries online first, falls back to offline cache
   */
  async getLastUsedLocation(userId: string): Promise<DeliveryLocation | null> {
    try {
      // Try online first
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('user_locations')
          .select('*')
          .eq('user_id', userId)
          .order('last_used_at', { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          // Cache it offline
          await this.cacheLocationOffline(userId, data)
          
          return {
            id: data.id,
            addressLine1: data.address_line1,
            addressLine2: data.address_line2 || undefined,
            city: data.city || undefined,
            postalCode: data.postal_code || undefined,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            isPrimary: data.is_primary
          }
        }
      }

      // Fallback to offline cache
      const offlineLocation = await locationManager.getLastUsedLocation(userId)
      if (offlineLocation) {
        return {
          id: offlineLocation.id,
          addressLine1: offlineLocation.addressLine1,
          addressLine2: offlineLocation.addressLine2 || undefined,
          city: offlineLocation.city || undefined,
          postalCode: offlineLocation.postalCode || undefined,
          latitude: offlineLocation.latitude,
          longitude: offlineLocation.longitude,
          isPrimary: offlineLocation.isPrimary
        }
      }

      return null
    } catch (error) {
      console.error('[LocationService] Failed to get last used location:', error)
      
      // Try offline as fallback
      const offlineLocation = await locationManager.getLastUsedLocation(userId)
      if (offlineLocation) {
        return {
          id: offlineLocation.id,
          addressLine1: offlineLocation.addressLine1,
          addressLine2: offlineLocation.addressLine2 || undefined,
          city: offlineLocation.city || undefined,
          postalCode: offlineLocation.postalCode || undefined,
          latitude: offlineLocation.latitude,
          longitude: offlineLocation.longitude,
          isPrimary: offlineLocation.isPrimary
        }
      }

      return null
    }
  }

  /**
   * Get all saved locations for user
   */
  async getUserLocations(userId: string): Promise<LocationWithMetadata[]> {
    try {
      // Try online first
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('user_locations')
          .select('*')
          .eq('user_id', userId)
          .order('last_used_at', { ascending: false })

        if (!error && data) {
          // Cache them offline
          for (const loc of data) {
            await this.cacheLocationOffline(userId, loc)
          }

          return data.map(loc => ({
            id: loc.id,
            addressLine1: loc.address_line1,
            addressLine2: loc.address_line2 || undefined,
            city: loc.city || undefined,
            postalCode: loc.postal_code || undefined,
            latitude: loc.latitude || 0,
            longitude: loc.longitude || 0,
            isPrimary: loc.is_primary,
            lastUsedAt: new Date(loc.last_used_at),
            createdAt: new Date(loc.created_at)
          }))
        }
      }

      // Fallback to offline cache
      const offlineLocations = await locationManager.getUserLocations(userId)
      return offlineLocations.map(loc => ({
        id: loc.id,
        addressLine1: loc.addressLine1,
        addressLine2: loc.addressLine2 || undefined,
        city: loc.city || undefined,
        postalCode: loc.postalCode || undefined,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isPrimary: loc.isPrimary,
        lastUsedAt: new Date(loc.lastUsedAt),
        createdAt: new Date(loc.createdAt)
      }))
    } catch (error) {
      console.error('[LocationService] Failed to get user locations:', error)
      
      // Try offline as fallback
      const offlineLocations = await locationManager.getUserLocations(userId)
      return offlineLocations.map(loc => ({
        id: loc.id,
        addressLine1: loc.addressLine1,
        addressLine2: loc.addressLine2 || undefined,
        city: loc.city || undefined,
        postalCode: loc.postalCode || undefined,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isPrimary: loc.isPrimary,
        lastUsedAt: new Date(loc.lastUsedAt),
        createdAt: new Date(loc.createdAt)
      }))
    }
  }

  /**
   * Save new location
   * Saves online if possible, always caches offline
   */
  async saveLocation(userId: string, location: DeliveryLocation): Promise<string> {
    try {
      let locationId = location.id

      // Try to save online
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('user_locations')
          .insert({
            user_id: userId,
            address_line1: location.addressLine1,
            address_line2: location.addressLine2 || null,
            city: location.city || null,
            postal_code: location.postalCode || null,
            latitude: location.latitude,
            longitude: location.longitude,
            is_primary: location.isPrimary || false,
            last_used_at: new Date().toISOString()
          })
          .select()
          .single()

        if (!error && data) {
          locationId = data.id
        }
      }

      // Always cache offline
      if (!locationId) {
        locationId = await locationManager.saveLocation({
          userId,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2 || null,
          city: location.city || null,
          postalCode: location.postalCode || null,
          latitude: location.latitude,
          longitude: location.longitude,
          isPrimary: location.isPrimary || false,
          lastUsedAt: Date.now()
        })
      } else {
        await locationManager.saveLocation({
          userId,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2 || null,
          city: location.city || null,
          postalCode: location.postalCode || null,
          latitude: location.latitude,
          longitude: location.longitude,
          isPrimary: location.isPrimary || false,
          lastUsedAt: Date.now()
        })
      }

      return locationId
    } catch (error) {
      console.error('[LocationService] Failed to save location:', error)
      
      // Save offline as fallback
      const locationId = await locationManager.saveLocation({
        userId,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2 || null,
        city: location.city || null,
        postalCode: location.postalCode || null,
        latitude: location.latitude,
        longitude: location.longitude,
        isPrimary: location.isPrimary || false,
        lastUsedAt: Date.now()
      })

      return locationId
    }
  }

  /**
   * Update location last used timestamp
   */
  async updateLastUsed(userId: string, locationId: string): Promise<void> {
    try {
      // Update online
      if (navigator.onLine) {
        await supabase
          .from('user_locations')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', locationId)
          .eq('user_id', userId)
      }

      // Update offline
      await locationManager.updateLastUsed(locationId)
    } catch (error) {
      console.error('[LocationService] Failed to update last used:', error)
      
      // Update offline as fallback
      await locationManager.updateLastUsed(locationId)
    }
  }

  /**
   * Set location as primary
   */
  async setPrimary(userId: string, locationId: string): Promise<void> {
    try {
      // Update online
      if (navigator.onLine) {
        // First, unset all primary locations for this user
        await supabase
          .from('user_locations')
          .update({ is_primary: false })
          .eq('user_id', userId)

        // Then set this one as primary
        await supabase
          .from('user_locations')
          .update({ is_primary: true })
          .eq('id', locationId)
          .eq('user_id', userId)
      }

      // Update offline
      await locationManager.setPrimary(locationId, userId)
    } catch (error) {
      console.error('[LocationService] Failed to set primary:', error)
      
      // Update offline as fallback
      await locationManager.setPrimary(locationId, userId)
    }
  }

  /**
   * Delete location
   */
  async deleteLocation(userId: string, locationId: string): Promise<void> {
    try {
      // Delete online
      if (navigator.onLine) {
        await supabase
          .from('user_locations')
          .delete()
          .eq('id', locationId)
          .eq('user_id', userId)
      }

      // Delete offline
      await locationManager.deleteLocation(locationId)
    } catch (error) {
      console.error('[LocationService] Failed to delete location:', error)
      
      // Delete offline as fallback
      await locationManager.deleteLocation(locationId)
    }
  }

  /**
   * Cache location offline
   */
  private async cacheLocationOffline(userId: string, data: any): Promise<void> {
    try {
      await locationManager.saveLocation({
        userId,
        addressLine1: data.address_line1,
        addressLine2: data.address_line2 || null,
        city: data.city || null,
        postalCode: data.postal_code || null,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        isPrimary: data.is_primary,
        lastUsedAt: new Date(data.last_used_at).getTime()
      })
    } catch (error) {
      console.warn('[LocationService] Failed to cache location offline:', error)
    }
  }

  /**
   * Detect current location using GPS
   */
  async detectLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => {
          console.error('[LocationService] Geolocation error:', error)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  /**
   * Reverse geocode coordinates to address (requires online)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    if (!navigator.onLine) {
      return null
    }

    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AT-Restaurant-App'
          }
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.display_name || null
    } catch (error) {
      console.error('[LocationService] Reverse geocode failed:', error)
      return null
    }
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance()
