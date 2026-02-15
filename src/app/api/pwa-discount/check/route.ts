import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/pwa-discount/check
 * Checks if user is eligible for PWA discount
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { 
          eligible: false,
          message: 'User not authenticated'
        },
        { status: 200 }
      )
    }

    // Call database function to check eligibility
    const { data, error } = await supabase.rpc('check_pwa_discount_eligibility', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Error checking PWA discount eligibility:', error)
      return NextResponse.json(
        { error: 'Failed to check eligibility' },
        { status: 500 }
      )
    }

    const result = data as {
      eligible: boolean
      activated_at: string | null
      discount_percentage: number
      message?: string
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error in check discount API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
