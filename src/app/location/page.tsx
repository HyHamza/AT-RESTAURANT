'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Phone, Clock, Mail, ExternalLink } from 'lucide-react'

// Google Maps component
function GoogleMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null) // Using any to avoid type issues

  const restaurantLocation = {
    lat: 31.4504, // Faisalabad, Pakistan coordinates
    lng: 73.1350
  }

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current || typeof window === 'undefined') return

      // Check if Google Maps is loaded
      if (!(window as any).google) return

      const google = (window as any).google

      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center: restaurantLocation,
        zoom: 15,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      // Add marker
      new google.maps.Marker({
        position: restaurantLocation,
        map: map,
        title: 'AT RESTAURANT',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#f97316" stroke="white" stroke-width="4"/>
              <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">AT</text>
            </svg>
          `),
          scaledSize: new google.maps.Size(40, 40)
        }
      })

      mapInstanceRef.current = map
    }

    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      // Show fallback if no API key
      return
    }

    // Load Google Maps API
    if (typeof window !== 'undefined' && !(window as any).google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`
      script.async = true
      script.defer = true
      
      // Make initMap globally available
      ;(window as any).initMap = initMap
      
      document.head.appendChild(script)
    } else if ((window as any).google) {
      initMap()
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Check if API key is available
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    // Fallback map with embedded Google Maps iframe
    return (
      <div className="w-full h-64 rounded-lg overflow-hidden">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d109161.0!2d73.1350!3d31.4504!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x392242a895a55ca9%3A0x4b5d8d8b8b8b8b8b!2sFaisalabad%2C%20Punjab%2C%20Pakistan!5e0!3m2!1sen!2s!4v1234567890123!5m2!1sen!2s"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="AT Restaurant Location - Faisalabad, Pakistan"
        />
      </div>
    )
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full h-64 rounded-lg"
      style={{ minHeight: '256px' }}
    />
  )
}

export default function LocationPage() {
  const restaurantInfo = {
    name: 'AT RESTAURANT',
    address: 'Kotwali Road, Faisalabad, Punjab, Pakistan',
    phone: '+92 41 123 4567',
    email: 'info@atrestaurant.pk',
    coordinates: {
      lat: 31.4504,
      lng: 73.1350
    }
  }

  const hours = [
    { day: 'Monday - Thursday', time: '11:00 AM - 10:00 PM' },
    { day: 'Friday - Saturday', time: '11:00 AM - 11:00 PM' },
    { day: 'Sunday', time: '12:00 PM - 9:00 PM' }
  ]

  const handleGetDirections = () => {
    const query = encodeURIComponent('AT RESTAURANT, Kotwali Road, Faisalabad, Punjab, Pakistan')
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Our Location</h1>
          <p className="text-gray-600 mt-2">Visit us for an exceptional dining experience in Faisalabad</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map Section */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  <span>Find Us in Faisalabad</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Google Maps Integration */}
                <div className="mb-4">
                  <GoogleMap />
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                    <p className="text-gray-600">{restaurantInfo.address}</p>
                  </div>

                  <Button 
                    onClick={handleGetDirections}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a 
                        href={`tel:${restaurantInfo.phone}`}
                        className="text-gray-600 hover:text-orange-500 transition-colors"
                      >
                        {restaurantInfo.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a 
                        href={`mailto:${restaurantInfo.email}`}
                        className="text-gray-600 hover:text-orange-500 transition-colors"
                      >
                        {restaurantInfo.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-gray-600">{restaurantInfo.address}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span>Hours of Operation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{schedule.day}</span>
                      <span className="text-gray-600">{schedule.time}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> Hours may vary on holidays. Please call ahead to confirm.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Parking & Accessibility */}
            <Card>
              <CardHeader>
                <CardTitle>Parking & Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Parking</h4>
                    <p className="text-gray-600 text-sm">
                      Free parking available in our lot behind the restaurant. 
                      Street parking also available on Kotwali Road.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Accessibility</h4>
                    <p className="text-gray-600 text-sm">
                      Our restaurant is fully wheelchair accessible with ramp access 
                      and accessible restrooms.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Public Transportation</h4>
                    <p className="text-gray-600 text-sm">
                      Located near Faisalabad Railway Station. Local buses and rickshaws 
                      are available for convenient transportation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Visit AT RESTAURANT in Faisalabad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-3">What to Expect</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Warm, welcoming Pakistani hospitality</li>
                    <li>• Fresh, locally-sourced ingredients</li>
                    <li>• Authentic flavors and traditional recipes</li>
                    <li>• Clean, comfortable dining environment</li>
                    <li>• Family-friendly atmosphere</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Reservations & Orders</h3>
                  <div className="space-y-3">
                    <p className="text-gray-600 text-sm">
                      Walk-ins are welcome, but reservations are recommended for parties of 6 or more.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="outline" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Call for Reservations
                      </Button>
                      <Button className="flex-1 bg-orange-500 hover:bg-orange-600">
                        Order Online
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}