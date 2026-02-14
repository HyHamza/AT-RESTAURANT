/**
 * React Hook for Location Management with Offline Support
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { locationService, type DeliveryLocation, type LocationWithMetadata } from '@/lib/location-service-enhanced'

interface UseLocationReturn {
  locations: LocationWithMetadata[]
  lastUsedLocation: DeliveryLocation | null
  loading: boolean
  detecting: boolean
  loadLastUsed: (userId: string) => Promise<void>
  loadUserLocations: (userId: string) => Promise<void>
  saveLocation: (userId: string, location: DeliveryLocation) => Promise<string>
  updateLastUsed: (userId: string, locationId: string) => Promise<void>
  setPrimary: (userId: string, locationId: string) => Promise<void>
  deleteLocation: (userId: string, locationId: string) => Promise<void>
  detectLocation: () => Promise<{ latitude: number; longitude: number; accuracy: number } | null>
  reverseGeocode: (latitude: number, longitude: number) => Promise<string | null>
}

export function useLocation(): UseLocationReturn {
  const [locations, setLocations] = useState<LocationWithMetadata[]>([])
  const [lastUsedLocation, setLastUsedLocation] = useState<DeliveryLocation | null>(null)
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)

  // Load last used location
  const loadLastUsed = useCallback(async (userId: string) => {
    if (!userId) return

    setLoading(true)
    try {
      const location = await locationService.getLastUsedLocation(userId)
      setLastUsedLocation(location)
    } catch (error) {
      console.error('[useLocation] Failed to load last used location:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load all user locations
  const loadUserLocations = useCallback(async (userId: string) => {
    if (!userId) return

    setLoading(true)
    try {
      const userLocations = await locationService.getUserLocations(userId)
      setLocations(userLocations)
    } catch (error) {
      console.error('[useLocation] Failed to load user locations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save new location
  const saveLocation = useCallback(async (userId: string, location: DeliveryLocation): Promise<string> => {
    try {
      const locationId = await locationService.saveLocation(userId, location)
      
      // Refresh locations
      await loadUserLocations(userId)
      
      return locationId
    } catch (error) {
      console.error('[useLocation] Failed to save location:', error)
      throw error
    }
  }, [loadUserLocations])

  // Update last used timestamp
  const updateLastUsed = useCallback(async (userId: string, locationId: string) => {
    try {
      await locationService.updateLastUsed(userId, locationId)
      
      // Refresh locations
      await loadUserLocations(userId)
    } catch (error) {
      console.error('[useLocation] Failed to update last used:', error)
      throw error
    }
  }, [loadUserLocations])

  // Set location as primary
  const setPrimary = useCallback(async (userId: string, locationId: string) => {
    try {
      await locationService.setPrimary(userId, locationId)
      
      // Refresh locations
      await loadUserLocations(userId)
    } catch (error) {
      console.error('[useLocation] Failed to set primary:', error)
      throw error
    }
  }, [loadUserLocations])

  // Delete location
  const deleteLocation = useCallback(async (userId: string, locationId: string) => {
    try {
      await locationService.deleteLocation(userId, locationId)
      
      // Refresh locations
      await loadUserLocations(userId)
    } catch (error) {
      console.error('[useLocation] Failed to delete location:', error)
      throw error
    }
  }, [loadUserLocations])

  // Detect current location using GPS
  const detectLocation = useCallback(async () => {
    setDetecting(true)
    try {
      const coords = await locationService.detectLocation()
      return coords
    } catch (error) {
      console.error('[useLocation] Failed to detect location:', error)
      return null
    } finally {
      setDetecting(false)
    }
  }, [])

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    try {
      const address = await locationService.reverseGeocode(latitude, longitude)
      return address
    } catch (error) {
      console.error('[useLocation] Failed to reverse geocode:', error)
      return null
    }
  }, [])

  return {
    locations,
    lastUsedLocation,
    loading,
    detecting,
    loadLastUsed,
    loadUserLocations,
    saveLocation,
    updateLastUsed,
    setPrimary,
    deleteLocation,
    detectLocation,
    reverseGeocode
  }
}
