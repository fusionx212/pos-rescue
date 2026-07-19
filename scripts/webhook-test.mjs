// RED→GREEN proof for /api/stripe/webhook — no live Stripe call.
// 1. Wrong signature must be rejected 400 (RED)
// 2. Valid signature must be accepted 200 (GREEN)
// 3. A Supabase Realtime subscriber on pay:<sessionId> must receive the
//    'paid' broadcast the webhook emits.
// Run: node scripts/webhook-test.mjs   (dev server must be up)
import { config } from 'dotenv'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

config({ path: new URL('../.env.local', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') })

const BASE = process.env.BASE_URL || 'http://localhost:3177'
const SECRET = process.env.STRIPE_WEBHOOK_SECRET
const sessionId = 'cs_test_webhooktest_' + Date.now()

const event = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2026-06-30',
  type: 'checkout.session.completed',
  account: 'acct_1TuoZCGWecmcitiP',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: sessionId,
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 420,
      currency: 'gbp',
      metadata: { merchant_id: 'cc7616da-ba0a-4080-9a42-e7c6ccfa6ba4', note: 'webhook test' },
    },
  },
}
const payload = JSON.stringify(event)
const stripe = new Stripe('sk_test_dummy_key_signature_only')

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗ FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) failures++
}

// Subscriber FIRST, so the broadcast can't race past us.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)
const received = new Promise(resolve => {
  supabase
    .channel(`pay:${sessionId}`)
    .on('broadcast', { event: 'paid' }, msg => resolve(msg.payload))
    .subscribe()
})
await new Promise(r => setTimeout(r, 1500)) // let the socket join

// 1. RED — wrong signature
const bad = await fetch(`${BASE}/api/stripe/webhook`, {
  method: 'POST',
  headers: { 'stripe-signature': 't=1,v1=deadbeef', 'content-type': 'application/json' },
  body: payload,
})
check('wrong signature rejected 400', bad.status === 400, `got ${bad.status}`)

// 2. GREEN — valid signature
const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
const good = await fetch(`${BASE}/api/stripe/webhook`, {
  method: 'POST',
  headers: { 'stripe-signature': sig, 'content-type': 'application/json' },
  body: payload,
})
check('valid signature accepted 200', good.status === 200, `got ${good.status}`)

// 3. Broadcast received
const msg = await Promise.race([
  received,
  new Promise(r => setTimeout(() => r(null), 8000)),
])
check(
  'subscriber received paid broadcast',
  msg?.amount_total === 420 && msg?.note === 'webhook test',
  JSON.stringify(msg),
)

await supabase.removeAllChannels()
process.exit(failures ? 1 : 0)
