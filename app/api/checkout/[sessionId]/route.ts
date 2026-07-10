import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/[sessionId]
 *
 * Retrieves the Checkout Session URL so the till can render a QR code
 * that redirects customers to the Stripe-hosted Checkout page.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { sessionId } = params

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      )
    }

    const session = await stripe().checkout.sessions.retrieve(sessionId)

    if (!session.url) {
      return NextResponse.json(
        { error: 'Checkout session has no URL' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      url: session.url,
      amount_total: session.amount_total,
      status: session.status,
      currency: session.currency,
    })
  } catch (err) {
    console.error('Retrieve checkout error:', err)
    const message =
      err instanceof Error ? err.message : 'Failed to retrieve checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}