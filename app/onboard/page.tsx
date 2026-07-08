'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useRef, Suspense } from 'react'
import { getOAuthState, onboardAction } from './actions'
import { useFormState, useFormStatus } from 'react-dom'

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'Connect Stripe' },
    { num: 2, label: 'Business Details' },
    { num: 3, label: 'Ready' },
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              current === s.num
                ? 'bg-indigo-600 text-white'
                : current > s.num
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
            {current > s.num ? '✓' : s.num}
          </div>
          <span
            className={`text-sm hidden sm:inline ${
              current === s.num
                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-8 h-px bg-slate-300 dark:bg-slate-600 mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}

function Step1Connect() {
  const connecting = useRef(false)

  const handleConnect = useCallback(async () => {
    if (connecting.current) return
    connecting.current = true

    try {
      // Generate CSRF state and store in cookie (server-side).
      const state = await getOAuthState()

      const redirectUri = `${window.location.origin}/api/stripe/oauth/callback`
      const connectUrl =
        `https://connect.stripe.com/oauth/authorize` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID || '')}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=read_write` +
        `&state=${encodeURIComponent(state)}`

      window.location.href = connectUrl
    } catch {
      connecting.current = false
    }
  }, [])

  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">🔗</div>
      <h2 className="text-xl font-semibold">Connect your Stripe account</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
        POS Rescue works with your <strong>existing Stripe account</strong>.
        Click below to connect — funds flow directly to your account. We never
        touch your money.
      </p>
      <button
        onClick={handleConnect}
        className="inline-block w-full rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors text-center"
      >
        Connect with Stripe
      </button>
      <p className="text-xs text-slate-400">
        You&apos;ll be redirected to Stripe to authorize access. Standard Stripe
        account required.
      </p>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Saving…' : 'Save & Arm POS Rescue'}
    </button>
  )
}

function Step2Details({ merchantId }: { merchantId: string }) {
  const [state, formAction] = useFormState(onboardAction, undefined)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-3">🏪</div>
        <h2 className="text-xl font-semibold">Your Business Details</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          These appear on the payment receipt for your customers.
        </p>
      </div>

      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="merchantId" value={merchantId} />

        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium mb-1"
          >
            Business Legal Name *
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            placeholder="e.g. Acme Corner Shop Ltd"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="vatNumber"
            className="block text-sm font-medium mb-1"
          >
            VAT Number
          </label>
          <input
            id="vatNumber"
            name="vatNumber"
            type="text"
            placeholder="e.g. GB123456789 (optional)"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="taxRatePct"
            className="block text-sm font-medium mb-1"
          >
            Base Tax Rate (%)
          </label>
          <input
            id="taxRatePct"
            name="taxRatePct"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue="20"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Default tax rate applied to all POS Rescue transactions.
          </p>
        </div>

        <SubmitButton />
      </form>
    </div>
  )
}

function Step3Armed() {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">✅</div>
      <h2 className="text-xl font-semibold">You&apos;re Armed!</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
        POS Rescue is ready. If your POS or internet ever goes down, just open
        this site, enter the amount, and show the QR code to your customer.
        They pay on their own phone — Apple Pay, Google Pay, or card.
      </p>
      <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-300">
        <strong>Your Stripe account is connected</strong> and funds will flow
        directly to your bank account.
      </div>
    </div>
  )
}

function OnboardContent() {
  const searchParams = useSearchParams()
  const step = parseInt(searchParams.get('step') || '1') as 1 | 2 | 3
  const merchantId = searchParams.get('id') || ''
  const error = searchParams.get('error')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">POS Rescue</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Get set up in 3 simple steps
          </p>
        </div>

        {/* Steps */}
        {[1, 2].includes(step) && <StepIndicator current={step} />}

        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6 text-sm text-red-700 dark:text-red-300">
            {error === 'stripe_denied' &&
              'You denied the Stripe connection. Please try again when ready.'}
            {error === 'no_code' &&
              'Something went wrong with the Stripe connection. Please try again.'}
            {error === 'callback_failed' &&
              'Failed to complete the Stripe connection. Please try again.'}
            {!['stripe_denied', 'no_code', 'callback_failed'].includes(
              error,
            ) && 'An error occurred. Please try again.'}
          </div>
        )}

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          {step === 1 && <Step1Connect />}
          {step === 2 && <Step2Details merchantId={merchantId} />}
          {step === 3 && <Step3Armed />}
          {step > 3 && <Step3Armed />}
        </div>
      </div>
    </main>
  )
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <OnboardContent />
    </Suspense>
  )
}