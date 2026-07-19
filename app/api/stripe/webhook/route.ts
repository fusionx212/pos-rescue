import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/webhook
 *
 * Connect webhook (events from connected accounts). On
 * checkout.session.completed it broadcasts a transient "paid" message on
 * Supabase Realtime channel `pay:<sessionId>` — the till QR screen and the
 * customer page flip green off this. NOTHING is persisted: the merchant's
 * Stripe account remains the system of record (zero per-transaction rows).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Signature verification needs the raw body, byte-for-byte.
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status === 'paid') {
      const broadcast = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              {
                topic: `pay:${session.id}`,
                event: 'paid',
                payload: {
                  amount_total: session.amount_total,
                  currency: session.currency,
                  note: session.metadata?.note ?? null,
                  merchant_id: session.metadata?.merchant_id ?? null,
                  account: 'account' in event ? event.account : null,
                },
              },
            ],
          }),
        },
      )

      // No DB writes anywhere, so letting Stripe retry on failure is safe
      // and the only delivery guarantee we have.
      if (!broadcast.ok) {
        console.error('Realtime broadcast failed:', broadcast.status)
        return NextResponse.json({ error: 'Broadcast failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
