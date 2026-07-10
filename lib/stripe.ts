import Stripe from 'stripe'

// Lazy — never instantiate at module scope (breaks builds + leaks if key missing).
export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}