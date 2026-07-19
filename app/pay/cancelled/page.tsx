export const metadata = { title: 'Cancelled — POS Rescue' }

export default function PayCancelledPage() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">✕</div>
      <h1 className="text-2xl font-bold mb-2">Payment cancelled</h1>
      <p className="text-gray-400 max-w-xs">
        Nothing was charged. Scan the stall&apos;s QR code again to retry.
      </p>
    </main>
  )
}
