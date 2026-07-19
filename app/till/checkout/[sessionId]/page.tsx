'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient } from '@supabase/supabase-js'
import { playPaidChime } from '@/lib/chime'

export default function CheckoutQRPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null) // epoch seconds
  const [countdown, setCountdown] = useState<number | null>(null)
  const [paid, setPaid] = useState(false)

  const sessionId = params.sessionId as string
  const amountParam = searchParams.get('amount') || '0'
  const note = searchParams.get('note') || ''

  // Load merchant identity from localStorage and fetch session URL.
  // The session lives on the merchant's connected account, so the API
  // needs the merchant id to retrieve it.
  useEffect(() => {
    const name = localStorage.getItem('pos_rescue_merchant_name') || 'Your Business'
    setMerchantName(name)

    const merchantId = localStorage.getItem('pos_rescue_merchant_id')
    if (!merchantId) {
      setError('This device is not armed — complete onboarding first')
      return
    }

    fetch(`/api/checkout/${sessionId}?m=${encodeURIComponent(merchantId)}`)
      .then(r => r.json())
      .then(data => {
        // A completed session has no URL — reloading this screen after the
        // sale must show PAID, not an error.
        if (data.payment_status === 'paid') {
          setPaid(true)
          return
        }
        if (data.url) {
          setQrUrl(data.url)
          if (typeof data.expires_at === 'number') setExpiresAt(data.expires_at)
        } else {
          setError(data.error || 'Could not load checkout session')
        }
      })
      .catch(() => setError('Failed to load checkout'))
  }, [sessionId])

  // Generate QR code on the canvas when URL is available
  useEffect(() => {
    if (!qrUrl || !canvasRef.current) return

    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 400,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
  }, [qrUrl])

  // Countdown to the session's real Stripe expiry
  useEffect(() => {
    if (expiresAt === null || paid) return
    const tick = () =>
      setCountdown(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, paid])

  // PAID signal, path 1: Supabase Realtime broadcast from the webhook —
  // instant. Path 2 (below): poll the session as a belt-and-braces fallback
  // for flaky festival connections. First one to land wins.
  useEffect(() => {
    if (paid) return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const supabase = createClient(url, key)
    const channel = supabase
      .channel(`pay:${sessionId}`)
      .on('broadcast', { event: 'paid' }, () => setPaid(true))
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, paid])

  useEffect(() => {
    if (paid || error) return
    const merchantId = localStorage.getItem('pos_rescue_merchant_id')
    if (!merchantId) return
    const timer = setInterval(async () => {
      try {
        const r = await fetch(
          `/api/checkout/${sessionId}?m=${encodeURIComponent(merchantId)}`,
        )
        const d = await r.json()
        if (d.payment_status === 'paid') setPaid(true)
      } catch {
        // Offline blip — next poll retries.
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [sessionId, paid, error])

  // Chime once when the sale lands
  useEffect(() => {
    if (paid) playPaidChime()
  }, [paid])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Format the amount in pounds
  const displayAmount = (() => {
    const p = parseInt(amountParam, 10)
    if (isNaN(p)) return '£0.00'
    const pounds = Math.floor(p / 100)
    const pence = p % 100
    return `£${pounds}.${pence.toString().padStart(2, '0')}`
  })()

  if (paid) {
    return (
      <div className="min-h-screen bg-emerald-600 text-white flex flex-col items-center justify-center p-6">
        <div className="text-8xl mb-4">✓</div>
        <h1 className="text-4xl font-extrabold mb-2">PAID</h1>
        <div className="text-3xl font-mono font-bold mb-1">{displayAmount}</div>
        {note && <div className="text-emerald-100 mb-6">Ref: {note}</div>}
        <a
          href="/till"
          className="mt-6 w-full max-w-xs rounded-xl bg-white text-emerald-700 font-bold text-lg py-4 text-center"
        >
          New sale →
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Merchant Name */}
        <h1 className="text-xl font-bold text-gray-200">{merchantName}</h1>

        {/* Amount */}
        <div className="text-4xl font-mono font-bold">{displayAmount}</div>

        {/* Note */}
        {note && (
          <div className="text-sm text-gray-400">
            Ref: {note}
          </div>
        )}

        {/* Trust Dressing */}
        <p className="text-sm text-gray-400">
          Scan to pay securely via Apple Pay / Google Pay for{' '}
          <span className="font-semibold text-gray-300">{merchantName}</span>
        </p>

        {/* QR Code with scan boundary */}
        <div className="relative inline-flex items-center justify-center">
          {/* Scan boundary frame */}
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-500/30" />
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-amber-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-amber-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-amber-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-amber-400 rounded-br-lg" />

          {error ? (
            <div className="w-[280px] h-[280px] flex items-center justify-center text-red-400 text-sm">
              {error}
            </div>
          ) : countdown === 0 ? (
            <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-2 text-amber-400 text-sm px-6 text-center">
              <span>This code has expired.</span>
              <span className="text-gray-400">
                Go back and generate a fresh one.
              </span>
            </div>
          ) : !qrUrl ? (
            <div className="w-[280px] h-[280px] flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-amber-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="rounded-xl p-2"
              width={280}
              height={280}
            />
          )}
        </div>

        {/* Session ID and expiry */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>Session: {sessionId.slice(0, 12)}…{sessionId.slice(-4)}</p>
          {countdown !== null && countdown > 0 && (
            <p>Expires in {formatTime(countdown)}</p>
          )}
        </div>

        {/* Back button */}
        <a
          href="/till"
          className="inline-block w-full rounded-xl bg-[#2a2a2a] text-gray-300 font-semibold py-3 hover:bg-[#3a3a3a] transition-colors"
        >
          ← Back to Keypad
        </a>
      </div>
    </div>
  )
}