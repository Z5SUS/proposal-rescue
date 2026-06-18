import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Owner Keys ───────────────────────────────────────────────────────────────
const OWNER_KEYS = (process.env.OWNER_KEYS ?? 'Z5-OWNER').split(',').map((k) => k.trim());

// ─── License Validation Logic ─────────────────────────────────────────────────
//
// Current implementation uses pattern matching.
// TODO: Replace with a real database lookup (Supabase / Paddle / Lemon Squeezy).
//
// Expected license key formats:
//   Owner  → Z5-OWNER (or any key in OWNER_KEYS env var)
//   Pro    → PR-XXXX-XXXX-XXXX (16 chars after prefix, uppercase)
//   Free   → anything else → not valid

function validateLicenseKey(licenseKey: string): { valid: boolean; plan: string } {
  const key = (licenseKey ?? '').trim();

  if (!key) {
    return { valid: false, plan: 'free' };
  }

  // Owner check (internal use)
  if (OWNER_KEYS.includes(key)) {
    return { valid: true, plan: 'owner' };
  }

  // Lifetime key pattern: LT-XXXX-XXXX-XXXX
  if (/^lt-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(key)) {
    // TODO: Query Supabase to confirm the key exists and is active
    return { valid: true, plan: 'lifetime' };
  }

  // Agency key pattern: AG-XXXX-XXXX-XXXX
  if (/^ag-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(key)) {
    // TODO: Query Supabase to confirm the key exists and is active
    return { valid: true, plan: 'agency' };
  }

  // Solo key pattern: PR-XXXX-XXXX-XXXX (legacy + new)
  if (/^pr-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(key)) {
    // TODO: Query Supabase to confirm the key exists and is active
    return { valid: true, plan: 'solo' };
  }

  return { valid: false, plan: 'free' };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { licenseKey } = req.body as { licenseKey?: string };

  if (typeof licenseKey !== 'string') {
    return res.status(400).json({ error: 'Missing required field: licenseKey (string).' });
  }

  const result = validateLicenseKey(licenseKey);

  return res.status(200).json({
    valid: result.valid,
    plan: result.plan,
    message: result.valid
      ? `License valid — Plan: ${result.plan}`
      : 'Invalid or unrecognized license key.',
  });
}
