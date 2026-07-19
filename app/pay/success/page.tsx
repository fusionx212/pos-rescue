export const metadata = { title: 'Paid — POS Rescue' }

/**
 * Minimal customer success screen. B3 replaces this with the
 * webhook-driven green flash + VAT receipt experience.
 */
export default function PaySuccessPage() {
  return (
    <main className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="text-7xl mb-4">✓</div>
      <h1 className="text-3xl font-bold mb-2">PAID</h1>
      <p className="text-emerald-100 max-w-xs">
        Payment received. Show this screen to the stall — your card receipt
        arrives by email from Stripe.
      </p>
    </main>
  )
}
