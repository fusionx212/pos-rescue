import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-5xl mb-2">🆘</div>
        <h1 className="text-3xl font-bold">POS Rescue</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Emergency QR payments when your POS or internet goes down.
          Customers pay on their own phone — Apple Pay, Google Pay, or card.
        </p>
        <Link
          href="/onboard"
          className="inline-block w-full rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}