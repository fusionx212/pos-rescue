import { getMerchant } from '@/lib/merchant'
import { stripe } from '@/lib/stripe'
import PaidClient from './paid-client'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Paid — POS Rescue' }

const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; m?: string }
}) {
  const sessionId = searchParams.session_id
  const merchantId = searchParams.m

  let paid = false
  let amount = 0
  let note: string | null = null
  let created = Math.floor(Date.now() / 1000)
  let merchant: Awaited<ReturnType<typeof getMerchant>> = null
  let verified = false

  if (sessionId && merchantId) {
    merchant = await getMerchant(merchantId)
    if (merchant?.stripe_account_id) {
      try {
        const session = await stripe().checkout.sessions.retrieve(
          sessionId,
          {},
          { stripeAccount: merchant.stripe_account_id },
        )
        verified = true
        paid = session.payment_status === 'paid'
        amount = session.amount_total ?? 0
        note = session.metadata?.note ?? null
        created = session.created
      } catch (err) {
        console.error('Success page verify failed:', err)
      }
    }
  }

  // Landed here without params or verify failed — neutral confirmation only,
  // never claim "paid" on this domain without a verified session.
  if (!verified) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Payment complete?</h1>
        <p className="text-gray-400 max-w-xs">
          Check the confirmation email from Stripe, or ask the stall to check
          their till screen.
        </p>
      </main>
    )
  }

  if (!paid) {
    return (
      <main className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-8 text-center">
        <PaidClient pending />
        <div className="animate-pulse text-5xl mb-4">…</div>
        <h1 className="text-2xl font-bold mb-2">Confirming payment</h1>
        <p className="text-gray-400 max-w-xs">
          Hold on — this page refreshes automatically.
        </p>
      </main>
    )
  }

  const hasVat = Boolean(merchant?.vat_number)
  const ratePct = merchant?.tax_rate_pct ?? 0
  const netPence = hasVat ? Math.round(amount / (1 + ratePct / 100)) : amount
  const vatPence = amount - netPence
  const when = new Date(created * 1000).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  })

  return (
    <main className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-6 print:bg-white print:text-black">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt {
            position: absolute; left: 0; top: 0;
            width: 80mm; box-shadow: none; border-radius: 0;
          }
        }
        @page { margin: 4mm; }
      `}</style>

      <PaidClient />

      <div className="text-6xl mb-2">✓</div>
      <h1 className="text-3xl font-bold mb-6">PAID</h1>

      {/* 80mm-style receipt slip */}
      <div
        id="receipt"
        className="bg-white text-black font-mono text-[13px] leading-relaxed w-[302px] max-w-full p-5 rounded shadow-xl"
      >
        <div className="text-center font-bold text-[15px] uppercase">
          {merchant!.business_name}
        </div>
        {hasVat && (
          <div className="text-center">VAT No: {merchant!.vat_number}</div>
        )}
        <div className="text-center">{when}</div>
        <div className="my-2 border-t border-dashed border-black" />
        {note && (
          <div className="flex justify-between gap-2">
            <span className="truncate">{note}</span>
          </div>
        )}
        {hasVat ? (
          <>
            <div className="flex justify-between">
              <span>Net</span>
              <span>{gbp(netPence)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT @ {ratePct}%</span>
              <span>{gbp(vatPence)}</span>
            </div>
          </>
        ) : null}
        <div className="flex justify-between font-bold text-[15px]">
          <span>TOTAL</span>
          <span>{gbp(amount)}</span>
        </div>
        <div className="my-2 border-t border-dashed border-black" />
        <div>Paid by card via Stripe</div>
        <div className="break-all">Ref: {sessionId}</div>
        <div className="mt-2 text-center font-bold">
          {hasVat ? 'VAT Receipt Issued' : 'Receipt Issued'}
        </div>
        <div className="text-center">Powered by POS Rescue</div>
      </div>

      <p className="text-emerald-100 text-sm mt-6 max-w-xs text-center print:hidden">
        Show this screen to the stall. Stripe also emails your card receipt.
      </p>
    </main>
  )
}
