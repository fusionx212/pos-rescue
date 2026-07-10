'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = [5, 10, 20, 50] // in pounds — converted to pence on submit

export default function TillPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [online, setOnline] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState('')
  const initRef = useRef(false)

  // --- Merchant identification from localStorage ---
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const stored = localStorage.getItem('pos_rescue_merchant_id')
    const name = localStorage.getItem('pos_rescue_merchant_name')
    if (stored) setMerchantId(stored)
    if (name) setMerchantName(name)
  }, [])

  // --- Connection pulse beacon ---
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // --- Keypad input ---
  const handleDigit = useCallback((d: string) => {
    setAmount(prev => {
      // Prevent more than £9,999.99 (999999 pence)
      const next = prev + d
      if (Number(next) > 999999) return prev
      return next
    })
    setError('')
  }, [])

  const handleBackspace = useCallback(() => {
    setAmount(prev => prev.slice(0, -1))
    setError('')
  }, [])

  const handleClear = useCallback(() => {
    setAmount('')
    setError('')
  }, [])

  const handlePreset = useCallback((pence: number) => {
    setAmount(String(pence))
    setError('')
  }, [])

  // --- Submit ---
  const handleGenerateCheckout = useCallback(async () => {
    if (!merchantId) {
      setError('No merchant connected. Complete onboarding first.')
      return
    }

    const amountPence = parseInt(amount, 10)
    if (isNaN(amountPence) || amountPence < 50) {
      setError('Enter at least £0.50')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPence,
          merchantId,
          note: note.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      // Navigate to QR screen
      router.push(`/till/checkout/${data.sessionId}?amount=${amountPence}${note ? `&note=${encodeURIComponent(note)}` : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [amount, merchantId, note, router])

  // --- Format display ---
  const displayAmount = (() => {
    const chars = amount.padStart(3, '0')    // minimum 3 chars = £0.00
    const p = chars.slice(0, -2).replace(/^0+/, '') || '0'
    const f = chars.slice(-2)
    return `£${p}.${f}`
  })()

  const amountPence = parseInt(amount, 10) || 0

  if (!merchantId) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md space-y-4">
          <div className="text-6xl mb-2">🛒</div>
          <h1 className="text-2xl font-bold">POS Rescue</h1>
          <p className="text-gray-400 text-sm">
            Connect your Stripe account first to start accepting emergency payments.
          </p>
          <a
            href="/onboard"
            className="inline-block w-full rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Get Started — Onboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col">
      {/* Connection Beacon + Merchant Name */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="text-sm text-gray-400 truncate">
          {merchantName && <span>{merchantName}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {online ? 'Online' : 'Offline'}
          </span>
          <div
            className={`w-3 h-3 rounded-full ${
              online
                ? 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                : 'bg-red-500'
            }`}
          />
        </div>
      </header>

      {/* Amount Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-8">
        <div className="text-5xl sm:text-6xl font-mono font-bold tracking-wider mb-2">
          {displayAmount}
        </div>

        {/* Note/Reference Field */}
        <div className="w-full max-w-xs mb-6">
          <input
            type="text"
            placeholder="Note / Reference (e.g. job ref)"
            value={note}
            onChange={e => { setNote(e.target.value); setError('') }}
            maxLength={200}
            className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 text-center focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Preset Quick Buttons */}
        <div className="flex gap-3 mb-6">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => handlePreset(p * 100)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                amountPence === p * 100
                  ? 'bg-amber-600 text-white'
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] border border-[#3a3a3a]'
              }`}
            >
              £{p}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button
              key={d}
              onClick={() => handleDigit(String(d))}
              className="h-16 rounded-xl bg-[#2a2a2a] text-2xl font-bold text-white hover:bg-[#3a3a3a] active:bg-[#4a4a4a] transition-colors"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => handleDigit('0')}
            className="h-16 rounded-xl bg-[#2a2a2a] text-2xl font-bold text-white hover:bg-[#3a3a3a] active:bg-[#4a4a4a] transition-colors"
          >
            0
          </button>
          <button
            onClick={handleClear}
            className="h-16 rounded-xl bg-[#3a2a1a] text-sm font-semibold text-amber-400 hover:bg-[#4a3a2a] transition-colors"
          >
            CLEAR
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 rounded-xl bg-[#2a2a2a] text-lg text-gray-400 hover:bg-[#3a3a3a] transition-colors"
          >
            ⌫
          </button>
        </div>

        {/* Generate Checkout Button */}
        <button
          onClick={handleGenerateCheckout}
          disabled={loading || amountPence < 50}
          className="w-full max-w-xs rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800/30 disabled:text-amber-300/50 text-black font-bold text-lg py-4 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            'GENERATE EMERGENCY CHECKOUT'
          )}
        </button>
      </div>
    </div>
  )
}