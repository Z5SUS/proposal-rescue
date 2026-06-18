import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── Supabase Configuration ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
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

  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  // Signature validation (can be bypassed in development if secret is missing)
  const isSignatureValid = RAZORPAY_WEBHOOK_SECRET
    ? verifyRazorpaySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET)
    : true;

  if (!isSignatureValid) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body;
  console.log('[razorpay-webhook] Event received:', event.event);

  try {
    const supabase = getSupabase();
    // Check for payment captured or order paid events
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const paymentPayload = event.payload?.payment?.entity;
      const orderPayload = event.payload?.order?.entity;

      const email = paymentPayload?.email || event.payload?.payment_link?.entity?.customer?.email;
      const amount = (paymentPayload?.amount ?? 0) / 100; // Razorpay tracks in paisa
      const currency = paymentPayload?.currency || 'USD';
      const paymentId = paymentPayload?.id || 'fake-payment-id';

      // Parse plan from payment/order notes or metadata (defaults to pro)
      const notes = paymentPayload?.notes || orderPayload?.notes || {};
      const plan = (notes.plan || 'pro').toLowerCase() === 'mega' ? 'mega' : 'pro';

      if (email) {
        // 1. Create/Upsert User
        const { error: userError } = await supabase
          .from('users')
          .upsert({ email }, { onConflict: 'email' });

        if (userError) {
          console.error('[razorpay-webhook] User upsert error:', userError);
          return res.status(500).json({ error: 'Failed to upsert user.' });
        }

        // 2. Generate new License Key
        const prefix = plan === 'mega' ? 'MG' : 'PR';
        const licenseKey = generateRandomKey(prefix);

        // 3. Compute duration: Pro = 30 days, Mega = 365 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (plan === 'mega' ? 365 : 30));

        // 4. Save License
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

        // 5. Save Payment Transaction
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

        console.log(`[razorpay-webhook] Generated license ${licenseKey} for ${email}`);
        return res.status(200).json({
          success: true,
          licenseKey,
          plan,
          email,
          expiresAt: expiresAt.toISOString(),
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[razorpay-webhook] Processing failed:', err);
    return res.status(500).json({ error: 'Internal processing error.', details: err?.message });
  }
}
