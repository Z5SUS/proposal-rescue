import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── Owner Keys ───────────────────────────────────────────────────────────────
const OWNER_KEYS = (process.env.OWNER_KEYS ?? 'Z5-OWNER').split(',').map((k) => k.trim());

// ─── Supabase Configuration ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseClient: any = null;
function getSupabase(): any {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

async function validateLicenseKey(licenseKey: string): Promise<{ valid: boolean; plan: string; expiresAt?: string | null; status?: string; message?: string }> {
  const key = (licenseKey ?? '').trim();

  if (!key) {
    return { valid: false, plan: 'free', message: 'License key is empty.' };
  }

  // Owner check (bypasses Supabase query)
  if (OWNER_KEYS.includes(key)) {
    return { valid: true, plan: 'owner' };
  }

  try {
    const supabase = getSupabase();
    // Query Supabase for the license key
    const { data: license, error } = await supabase
      .from('licenses')
      .select('plan, expires_at, status')
      .eq('license_key', key)
      .maybeSingle();

    if (error) {
      console.error('[validate-license] Database error:', error);
      return { valid: false, plan: 'free', message: 'Database check failed.' };
    }

    if (!license) {
      return { valid: false, plan: 'free', message: 'License not found' };
    }

    // Check status
    if (license.status !== 'active') {
      return { valid: false, plan: 'free', message: 'License inactive' };
    }

    // Expiry check
    if (license.expires_at) {
      const expiry = new Date(license.expires_at);
      if (Date.now() > expiry.getTime()) {
        // Automatically mark as expired in DB
        await supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('license_key', key);

        return { valid: false, plan: 'free', message: 'License expired' };
      }
    }

    // Log successful validation
    try {
      await supabase.from('system_logs').insert({
        type: 'license_activation',
        message: `License validated: ${key}`,
        details: JSON.stringify({ plan: license.plan, email: license.user_email }),
      });
    } catch (logErr) {
      console.error('[validate-license] Failed to write activation log:', logErr);
    }

    return {
      valid: true,
      plan: license.plan,
      expiresAt: license.expires_at,
      status: 'active',
      message: 'License valid',
    };
  } catch (err: any) {
    console.error('[validate-license] Unexpected error during verification:', err);
    return { valid: false, plan: 'free', message: 'Internal validation error.' };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { licenseKey } = req.body as { licenseKey?: string };

  if (typeof licenseKey !== 'string') {
    return res.status(200).json({
      valid: false,
      plan: 'free',
      message: 'Missing required field: licenseKey (string).',
    });
  }

  const result = await validateLicenseKey(licenseKey);

  return res.status(200).json(result);
}
