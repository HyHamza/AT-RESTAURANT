import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/pwa-discount/activate
 * Activates PWA discount for a user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Get request body
    const body = await request.json()
    const { sessionId, deviceInfo } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user agent and IP from headers
    const userAgent = request.headers.get('user-agent') || ''
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Call database function to activate discount
    const { data, error } = await supabase.rpc('activate_pwa_discount', {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_device_info: deviceInfo || null,
      p_user_agent: userAgent,
      p_ip_address: ipAddress,
    })

    if (error) {
      console.error('Error activating PWA discount:', error)
      return NextResponse.json(
        { error: 'Failed to activate discount' },
        { status: 500 }
      )
    }

    const result = data as { 
      success: boolean
      message: string
      already_activated?: boolean
      duplicate_claim?: boolean
      discount_percentage?: number
    }

    return NextResponse.json(result, { 
      status: result.success || result.already_activated ? 200 : 400 
    })
  } catch (error) {
    console.error('Error in activate discount API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
