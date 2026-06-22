import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendRecoveryEmail } from './email.js';
import { getClientIp, isRateLimited } from './rate-limit.js';

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

  const cleanEmail = email.trim().toLowerCase();

  // 1. Rate Limiting Check: 5 requests/hour/IP
  const ip = getClientIp(req);
  const isLimited = await isRateLimited(ip, 'recover-license', 5);
  if (isLimited) {
    console.error(`LICENSE_RECOVERY_FAILED email=${cleanEmail} reason=rate_limited`);
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  console.log(`LICENSE_RECOVERY_REQUEST email=${cleanEmail}`);

  try {
    const supabase = getSupabase();

    // 2. Fetch all licenses associated with the email
    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('license_key, plan, expires_at, status')
      .eq('user_email', cleanEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[recover-license] Database error:', error);
      console.error(`LICENSE_RECOVERY_FAILED email=${cleanEmail} reason=db_error`);
      return res.status(500).json({ error: 'Database check failed.' });
    }

    if (!licenses || licenses.length === 0) {
      console.warn(`LICENSE_RECOVERY_FAILED email=${cleanEmail} reason=no_licenses_found`);
      return res.status(404).json({ error: 'No licenses found for this email address.' });
    }

    const now = Date.now();
    const updatedLicenses: any[] = [];

    // 3. Expiry lifecycle check & DB update
    for (const license of licenses) {
      let currentStatus = license.status;
      if (license.status === 'active' && license.expires_at) {
        const expiry = new Date(license.expires_at).getTime();
        if (now > expiry) {
          currentStatus = 'expired';
          // Update database in the background/concurrently
          await supabase
            .from('licenses')
            .update({ status: 'expired' })
            .eq('license_key', license.license_key);
        }
      }
      updatedLicenses.push({
        ...license,
        status: currentStatus
      });
    }

    // 4. Send recovery email containing the list of licenses
    const emailSent = await sendRecoveryEmail(cleanEmail, updatedLicenses);
    if (!emailSent) {
      console.error(`LICENSE_RECOVERY_FAILED email=${cleanEmail} reason=email_send_failed`);
      return res.status(500).json({ error: 'Failed to send recovery email.' });
    }

    console.log(`LICENSE_RECOVERY_SUCCESS email=${cleanEmail}`);

    // 5. Secure response: return success status only, do NOT expose keys in JSON
    return res.status(200).json({
      success: true,
      message: 'Recovery email sent successfully.'
    });

  } catch (err: any) {
    console.error('[recover-license] Unexpected error:', err);
    console.error(`LICENSE_RECOVERY_FAILED email=${cleanEmail} reason=internal_exception`);
    return res.status(500).json({ error: 'Internal server error.', details: err?.message });
  }
}
