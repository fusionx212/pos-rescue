'use server'

import { updateMerchant } from '@/lib/merchant'
import { redirect } from 'next/navigation'

export async function submitBusinessDetails(formData: FormData) {
  const merchantId = formData.get('merchantId') as string
  const businessName = formData.get('businessName') as string
  const vatNumber = formData.get('vatNumber') as string
  const taxRatePct = parseFloat(formData.get('taxRatePct') as string) || 0

  if (!merchantId) throw new Error('Missing merchant ID')
  if (!businessName?.trim()) throw new Error('Business name is required')

  await updateMerchant(merchantId, {
    business_name: businessName.trim(),
    vat_number: vatNumber.trim(),
    tax_rate_pct: Math.min(100, Math.max(0, taxRatePct)),
  })

  redirect(`/onboard?id=${merchantId}&step=3`)
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