'use client'

import { useEffect } from 'react'
import { playPaidChime } from '@/lib/chime'

/**
 * Client half of the success page: chime + green flash on confirmation,
 * auto-refresh while pending, and the print / save-PDF button.
 */
export default function PaidClient({ pending = false }: { pending?: boolean }) {
  useEffect(() => {
    if (pending) {
      const t = setTimeout(() => window.location.reload(), 3000)
      return () => clearTimeout(t)
    }
    playPaidChime()
  }, [pending])

  if (pending) return null

  return (
    <button
      onClick={() => window.print()}
      className="fixed bottom-5 inset-x-0 mx-auto w-64 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold py-3 backdrop-blur transition-colors print:hidden"
    >
      🖨 Print / Save PDF receipt
    </button>
  )
}
