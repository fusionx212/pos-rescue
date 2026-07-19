import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getMerchant } from '@/lib/merchant'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/[sessionId]?m=[merchantId]
 *
 * Retrieves the Checkout Session URL so the till can render a QR code.
 * The session was created ON the merchant's connected account (direct
 * charge), so the retrieve must carry the Stripe-Account header — without
 * it the session does not exist from the platform's point of view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { sessionId } = params
    const merchantId = request.nextUrl.searchParams.get('m')

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      )
    }

    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant ID (?m=) is required' },
        { status: 400 },
      )
    }

    const merchant = await getMerchant(merchantId)
    if (!merchant?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Merchant not found or not connected' },
        { status: 404 },
      )
    }

    const session = await stripe().checkout.sessions.retrieve(
      sessionId,
      {},
      { stripeAccount: merchant.stripe_account_id },
    )

    if (!session.url && session.status === 'open') {
      return NextResponse.json(
        { error: 'Checkout session has no URL' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      url: session.url,
      amount_total: session.amount_total,
      status: session.status,
      payment_status: session.payment_status,
      currency: session.currency,
      expires_at: session.expires_at,
    })
  } catch (err) {
    console.error('Retrieve checkout error:', err)
    const message =
      err instanceof Error ? err.message : 'Failed to retrieve checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
