import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendLicenseEmail } from './email';

// ─── Supabase Configuration ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Disable Vercel body parser to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

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

function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

function generateRandomKey(prefix: 'PR' | 'MG'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${segment()}-${segment()}-${segment()}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // 1. Read raw request body
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-razorpay-signature'] as string;

    // 2. Signature verification
    if (RAZORPAY_WEBHOOK_SECRET) {
      if (!signature) {
        return res.status(401).json({ error: 'Missing x-razorpay-signature header.' });
      }
      const isSignatureValid = verifyRazorpaySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
      if (!isSignatureValid) {
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    } else {
      console.warn('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set. Bypassing signature verification.');
    }

    // 3. Parse JSON event
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (parseErr: any) {
      return res.status(400).json({ error: 'Invalid JSON request body.', details: parseErr?.message });
    }

    console.log('[razorpay-webhook] Event received:', event.event);

    // 4. Ignore unrelated events — only process payment.captured
    if (event.event !== 'payment.captured') {
      console.log(`[razorpay-webhook] Ignoring event: ${event.event}`);
      return res.status(200).json({ received: true, ignored: true });
    }

    const paymentPayload = event.payload?.payment?.entity;
    const orderPayload = event.payload?.order?.entity;

    const paymentId = paymentPayload?.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment ID from payload.' });
    }

    const email = paymentPayload?.email || event.payload?.payment_link?.entity?.customer?.email;
    if (!email) {
      return res.status(400).json({ error: 'Missing customer email from payload.' });
    }

    const supabase = getSupabase();

    // 5. Duplicate protection check
    const { data: existingPayment, error: paymentQueryError } = await supabase
      .from('payments')
      .select('license_key, plan')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (paymentQueryError) {
      console.error('[razorpay-webhook] Error querying payments:', paymentQueryError);
      return res.status(500).json({ error: 'Failed to verify transaction duplicate status.' });
    }

    if (existingPayment) {
      console.log(`[razorpay-webhook] Duplicate webhook: Payment ${paymentId} already processed with license ${existingPayment.license_key}.`);
      return res.status(200).json({
        success: true,
        duplicate: true,
        licenseKey: existingPayment.license_key,
        plan: existingPayment.plan,
      });
    }

    // 6. Plan Detection
    const notes = paymentPayload?.notes || orderPayload?.notes || {};
    const desc = (paymentPayload?.description || orderPayload?.description || '').toLowerCase();
    const planStr = (notes.plan || notes.Plan || '').toLowerCase();
    const plan: 'pro' | 'mega' = (planStr === 'mega' || desc.includes('mega')) ? 'mega' : 'pro';

    const amount = (paymentPayload?.amount ?? 0) / 100; // Razorpay tracks in paisa
    const currency = paymentPayload?.currency || 'INR';

    // 7. Upsert User
    const { error: userError } = await supabase
      .from('users')
      .upsert({ email }, { onConflict: 'email' });

    if (userError) {
      console.error('[razorpay-webhook] User upsert error:', userError);
      return res.status(500).json({ error: 'Failed to upsert user record.' });
    }

    // 8. Generate License Key
    const prefix = plan === 'mega' ? 'MG' : 'PR';
    const licenseKey = generateRandomKey(prefix);

    // 9. Compute expiration duration (Pro = 30 days, Mega = 365 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan === 'mega' ? 365 : 30));

    // 10. Store License
    const { error: licenseError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        user_email: email,
        plan,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      });

    if (licenseError) {
      console.error('[razorpay-webhook] License insert error:', licenseError);
      return res.status(500).json({ error: 'Failed to generate license record.' });
    }

    // 11. Store Payment Log
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_id: paymentId,
        license_key: licenseKey,
        plan,
        amount,
        currency,
        status: 'paid',
      });

    if (paymentError) {
      console.warn('[razorpay-webhook] Payment log insert warning:', paymentError);
    }

    // 12. Email delivery of license key
    const emailSent = await sendLicenseEmail(email, licenseKey, plan);
    if (!emailSent) {
      console.warn(`[razorpay-webhook] Failed to send license key email to ${email}. Check Resend configuration.`);
    }

    console.log(`[razorpay-webhook] Successfully processed payment ${paymentId} and generated license ${licenseKey} for ${email}`);
    
    return res.status(200).json({
      success: true,
      licenseKey,
      plan,
      email,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (err: any) {
    console.error('[razorpay-webhook] Processing failed:', err);
    return res.status(500).json({ error: 'Internal processing error.', details: err?.message });
  }
}
