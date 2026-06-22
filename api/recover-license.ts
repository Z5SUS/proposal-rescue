import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendLicenseEmail } from './email.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { email } = req.body as { email?: string };

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required field: email (string).' });
  }

  try {
    const supabase = getSupabase();
    // Query Supabase for the most recent active license matching user_email
    const { data: license, error } = await supabase
      .from('licenses')
      .select('license_key, plan, expires_at, status')
      .eq('user_email', email.trim())
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[recover-license] Database error:', error);
      return res.status(500).json({ error: 'Database check failed.' });
    }

    if (!license) {
      return res.status(404).json({ error: 'No active license found for this email address.' });
    }

    // Expiry check
    if (license.expires_at) {
      const expiry = new Date(license.expires_at);
      if (Date.now() > expiry.getTime()) {
        // Automatically mark as expired in DB
        await supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('license_key', license.license_key);

        return res.status(404).json({ error: 'No active license found (license has expired).' });
      }
    }

    // Email the license key to the customer
    const emailSent = await sendLicenseEmail(email.trim(), license.license_key, license.plan);

    return res.status(200).json({
      success: true,
      emailSent,
      licenseKey: license.license_key,
      plan: license.plan,
      expiresAt: license.expires_at,
    });
  } catch (err: any) {
    console.error('[recover-license] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.', details: err?.message });
  }
}
