import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/pwa-discount/calculate
 * Calculates discount for a given amount
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Get request body
    const body = await request.json()
    const { amount } = body

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Call database function to calculate discount
    const { data, error } = await supabase.rpc('calculate_pwa_discount', {
      p_original_amount: amount,
      p_user_id: user?.id || null,
    })

    if (error) {
      console.error('Error calculating PWA discount:', error)
      return NextResponse.json(
        { error: 'Failed to calculate discount' },
        { status: 500 }
      )
    }

    const result = data as {
      original_amount: number
      discount_percentage: number
      discount_amount: number
      final_amount: number
      discount_applied: boolean
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error in calculate discount API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
