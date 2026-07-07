import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createMerchant } from '@/lib/merchant'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Stripe Connect OAuth redirects back with a `code` (authorization_code).
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    const redirectUrl = new URL('/onboard', request.url)
    redirectUrl.searchParams.set('error', 'stripe_denied')
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    const redirectUrl = new URL('/onboard', request.url)
    redirectUrl.searchParams.set('error', 'no_code')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    // Exchange the authorization code for the merchant's Stripe account ID.
    // StripeNode's oauth.token returns { stripe_user_id, ... } at runtime.
    // The upstream type omits some fields (email), so we use rawRequest to avoid
    // the type mismatch.
    const tokenResponse = await stripe().oauth.token({
      grant_type: 'authorization_code',
      code,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawToken = tokenResponse as any
    const stripeAccountId: string | undefined = rawToken.stripe_user_id

    if (!stripeAccountId) {
      throw new Error('Stripe OAuth response missing stripe_user_id')
    }

    // Fetch the connected account to get their email.
    const account = await stripe().accounts.retrieve(stripeAccountId)
    const email = account.email || account.id + '@stripe-connect.test'

    // Create a merchant record in Supabase.
    const merchant = await createMerchant(email, stripeAccountId)

    if (!merchant) {
      throw new Error('Failed to create merchant record')
    }

    // Redirect back to onboard with the merchant id for step 2.
    const redirectUrl = new URL('/onboard', request.url)
    redirectUrl.searchParams.set('id', merchant.id)
    redirectUrl.searchParams.set('step', '2')
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Stripe OAuth callback error:', err)
    const redirectUrl = new URL('/onboard', request.url)
    redirectUrl.searchParams.set('error', 'callback_failed')
    return NextResponse.redirect(redirectUrl)
  }
}