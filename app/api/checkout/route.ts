import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { getMerchant } from '@/lib/merchant'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout Session as a DIRECT CHARGE on the merchant's
 * connected Standard account. The platform (POS Rescue) collects an
 * application fee (1.5%) unless the merchant is on the 'armed' plan.
 *
 * Body: { amount: number (pence), merchantId: string, note?: string }
 * Returns: { sessionId: string, url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { amount, merchantId, note } = await request.json()

    // --- Validate amount ---
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 50) {
      return NextResponse.json(
        { error: 'Amount must be an integer >= 50 (minimum £0.50 in pence)' },
        { status: 400 },
      )
    }

    // Same ceiling the till keypad enforces — £9,999.99
    if (amount > 999999) {
      return NextResponse.json(
        { error: 'Amount exceeds the £9,999.99 maximum' },
        { status: 400 },
      )
    }

    // --- Validate merchant ---
    if (!merchantId || typeof merchantId !== 'string') {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 },
      )
    }

    const merchant = await getMerchant(merchantId)
    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 },
      )
    }

    if (!merchant.stripe_account_id) {
      return NextResponse.json(
        { error: 'Merchant has no connected Stripe account' },
        { status: 400 },
      )
    }

    // --- Build Checkout Session ---
    // Direct charge on the connected account using the Stripe-Account header.
    // This is the idiomatic pattern for Standard connected accounts:
    // funds go directly to the merchant's Stripe balance.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'POS Rescue — Emergency Payment',
              description: note
                ? `Reference: ${note}`
                : 'On-premises emergency checkout',
            },
            unit_amount: amount, // already in pence — safe
          },
          quantity: 1,
        },
      ],
      metadata: {
        merchant_id: merchant.id,
        ...(note ? { note } : {}),
      },
      // Enable automatic payment methods including Apple Pay / Google Pay
      // via Stripe Checkout's built-in wallet button rendering.
      automatic_tax: { enabled: false },
      allow_promotion_codes: false,
      // Customer cannot modify the amount — it's a fixed emergency checkout
      custom_text: {
        submit: {
          message: 'Emergency payment — amount is fixed by the merchant.',
        },
      },
      // Stripe's minimum session lifetime; the QR screen counts down to this
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${request.nextUrl.origin}/pay/success?session_id={CHECKOUT_SESSION_ID}&m=${merchant.id}`,
      cancel_url: `${request.nextUrl.origin}/pay/cancelled`,
    }

    // Application fee: 1.5%, skipped for 'armed' plan merchants
    // For direct charges on connected accounts, application_fee_amount
    // goes inside payment_intent_data.
    if (merchant.plan !== 'armed') {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(amount * 0.015),
      }
    }

    const session = await stripe().checkout.sessions.create(sessionParams, {
      stripeAccount: merchant.stripe_account_id,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (err) {
    console.error('Checkout API error:', err)
    const message =
      err instanceof Error ? err.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}