import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POS Rescue',
    short_name: 'POS Rescue',
    description: 'Emergency on-premises payment system — Stripe Checkout via QR',
    start_url: '/till',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#f59e0b',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}