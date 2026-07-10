'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { updateMerchant } from '@/lib/merchant'

/**
 * Generate a random state value and set it as an httpOnly cookie
 * for OAuth CSRF protection. The callback verifies this cookie
 * matches the state param returned by Stripe.
 */
export async function getOAuthState(): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('stripe_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 5, // 5 minutes — generous for the OAuth round-trip
  })
  return state
}

export async function onboardAction(_prev: unknown, formData: FormData) {
  // Same as submitBusinessDetails but returns errors instead of redirecting.
  const merchantId = formData.get('merchantId') as string
  const businessName = formData.get('businessName') as string
  const vatNumber = formData.get('vatNumber') as string
  const taxRatePct = parseFloat(formData.get('taxRatePct') as string) || 0

  if (!merchantId) return { error: 'Missing merchant ID' }
  if (!businessName?.trim()) return { error: 'Business name is required' }

  try {
    await updateMerchant(merchantId, {
      business_name: businessName.trim(),
      vat_number: vatNumber.trim(),
      tax_rate_pct: Math.min(100, Math.max(0, taxRatePct)),
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save' }
  }

  redirect(`/onboard?id=${merchantId}&step=3`)
}