import { createClient } from '@supabase/supabase-js'

// Server-only admin client (service role, bypasses RLS). NEVER import into a client component.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Public client (RLS-protected) — safe in browser + server.
// Lazily created to avoid crashing builds when .env.local is absent.
export function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}