import { supabaseAdmin } from './supabase'

export interface Merchant {
  id: string
  email: string
  business_name: string
  vat_number: string
  tax_rate_pct: number
  stripe_account_id: string | null
  plan: string
  armed_until: string | null
  created_at: string
}

export async function getMerchant(id: string): Promise<Merchant | null> {
  const { data } = await supabaseAdmin()
    .from('merchants')
    .select('*')
    .eq('id', id)
    .single()

  return data as Merchant | null
}

export async function getMerchantByStripeAccount(
  stripeAccountId: string,
): Promise<Merchant | null> {
  const { data } = await supabaseAdmin()
    .from('merchants')
    .select('*')
    .eq('stripe_account_id', stripeAccountId)
    .single()

  return data as Merchant | null
}

export async function createMerchant(
  email: string,
  stripeAccountId: string,
): Promise<Merchant | null> {
  const { data, error } = await supabaseAdmin()
    .from('merchants')
    .insert({
      email,
      stripe_account_id: stripeAccountId,
      armed_until: new Date(Date.now() + 7 * 86_400_000).toISOString(), // 7-day free trial
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create merchant: ${error.message}`)
  return data as Merchant | null
}

export async function updateMerchant(
  id: string,
  fields: Partial<{
    business_name: string
    vat_number: string
    tax_rate_pct: number
    email: string
  }>,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('merchants')
    .update(fields)
    .eq('id', id)

  if (error) throw new Error(`Failed to update merchant: ${error.message}`)
}