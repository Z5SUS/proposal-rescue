console.log('WEBHOOK FILE LOADED');

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendLicenseEmail } from './email.js';

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

function generateRandomKey(prefix: 'PR' | 'MG' | 'TS'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${segment()}-${segment()}-${segment()}`;
}

async function logSystemError(type: 'webhook_error' | 'email_error', message: string, details?: string) {
  try {
    const supabase = getSupabase();
    await supabase.from('system_logs').insert({ type, message, details });
  } catch (err) {
    console.error('[logSystemError] Failed to save log:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('WEBHOOK STARTED');
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let rawBody = '';
  try {
    // 1. Read raw request body
    rawBody = await getRawBody(req);
  } catch (err: any) {
    console.error('[razorpay-webhook] Failed to read raw body:', err);
    return res.status(400).json({ error: 'Failed to read request body.' });
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || (req.headers['x-real-ip'] as string) || 'unknown';
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // 2. Webhook Security Verification
  console.log('SIGNATURE_VERIFICATION_STARTED');

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error('SIGNATURE_VERIFICATION_FAILED reason=missing_webhook_secret_config');
    await logSystemError('webhook_error', 'Missing RAZORPAY_WEBHOOK_SECRET environment variable');
    return res.status(500).json({ error: 'Webhook signature verification is not configured on the server.' });
  }

  if (!signature) {
    console.error('SIGNATURE_VERIFICATION_FAILED reason=missing_signature');
    try {
      const supabase = getSupabase();
      await supabase.from('system_logs').insert({
        type: 'webhook_attack',
        message: 'Missing x-razorpay-signature header',
        details: JSON.stringify({ ip, timestamp: new Date().toISOString(), reason: 'missing_signature', payloadHash })
      });
    } catch (dbErr) {
      console.error('[razorpay-webhook] Failed to log webhook attack to DB:', dbErr);
    }
    return res.status(401).json({ error: 'Missing x-razorpay-signature header.' });
  }

  const isSignatureValid = verifyRazorpaySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
  if (!isSignatureValid) {
    console.error('SIGNATURE_VERIFICATION_FAILED reason=invalid_signature');
    try {
      const supabase = getSupabase();
      await supabase.from('system_logs').insert({
        type: 'webhook_attack',
        message: 'Invalid webhook signature',
        details: JSON.stringify({ ip, timestamp: new Date().toISOString(), reason: 'invalid_signature', payloadHash })
      });
    } catch (dbErr) {
      console.error('[razorpay-webhook] Failed to log webhook attack to DB:', dbErr);
    }
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  console.log('SIGNATURE_VERIFIED');

  try {
    // 3. Parse JSON event
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (parseErr: any) {
      console.error('VALIDATION FAILED reason=json_parse_error details=' + parseErr?.message);
      await logSystemError('webhook_error', 'JSON parse error', parseErr?.message);
      return res.status(400).json({ error: 'Invalid JSON request body.', details: parseErr?.message });
    }

    console.log('[ADMIN LOG] Webhook received:', event.event);
    console.log('EVENT RECEIVED');
    console.log(`event=${event.event}`);

    // 4. Ignore unrelated events — only process payment.captured or payment_link.paid
    const allowedEvents = ['payment.captured', 'payment_link.paid'];
    if (!allowedEvents.includes(event.event)) {
      console.log(`[razorpay-webhook] Ignoring event: ${event.event}`);
      return res.status(200).json({ received: true, ignored: true });
    }

    const paymentPayload = event.payload?.payment?.entity;
    const orderPayload = event.payload?.order?.entity;
    const paymentLinkPayload = event.payload?.payment_link?.entity;

    const paymentId = paymentPayload?.id;
    if (!paymentId) {
      console.error('VALIDATION FAILED reason=missing_payment_id');
      await logSystemError('webhook_error', 'Missing payment ID');
      return res.status(400).json({ error: 'Missing payment ID from payload.' });
    }

    console.log('[ADMIN LOG] Payment verified:', paymentId);

    const email = paymentPayload?.email || paymentLinkPayload?.customer?.email;
    if (!email) {
      console.error('VALIDATION FAILED reason=missing_customer_email');
      await logSystemError('webhook_error', 'Missing customer email');
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
      console.error('VALIDATION FAILED reason=db_payment_query_error details=' + paymentQueryError?.message);
      await logSystemError('webhook_error', 'Database payment query error', paymentQueryError?.message);
      return res.status(500).json({ error: 'Failed to verify transaction duplicate status.' });
    }

    if (existingPayment) {
      console.log(`[razorpay-webhook] Duplicate webhook: Payment ${paymentId} already processed with license ${existingPayment.license_key}.`);
      console.log('VALIDATION SUCCESS');
      return res.status(200).json({
        success: true,
        duplicate: true,
        licenseKey: existingPayment.license_key,
        plan: existingPayment.plan,
      });
    }

    console.log('[ADMIN LOG] Duplicate check passed:', paymentId);

    // 6. Plan Detection Priority
    // Priority 1: payment_link_id matching
    // Priority 2: notes.plan matching
    // Priority 3: reject
    let plan: 'pro' | 'mega' | 'test' | null = null;

    const TEST_PAYMENT_LINK_ID = process.env.TEST_PAYMENT_LINK_ID || '';
    const PRO_PAYMENT_LINK_ID = process.env.PRO_PAYMENT_LINK_ID || '';
    const MEGA_PAYMENT_LINK_ID = process.env.MEGA_PAYMENT_LINK_ID || '';

    const receivedPaymentLinkId = paymentLinkPayload?.id || paymentPayload?.payment_link_id;

    if (receivedPaymentLinkId) {
      if (TEST_PAYMENT_LINK_ID && receivedPaymentLinkId === TEST_PAYMENT_LINK_ID) {
        plan = 'test';
      } else if (PRO_PAYMENT_LINK_ID && receivedPaymentLinkId === PRO_PAYMENT_LINK_ID) {
        plan = 'pro';
      } else if (MEGA_PAYMENT_LINK_ID && receivedPaymentLinkId === MEGA_PAYMENT_LINK_ID) {
        plan = 'mega';
      }
    }

    if (!plan) {
      const notes = paymentPayload?.notes || paymentLinkPayload?.notes || orderPayload?.notes || {};
      const planStr = (notes.plan || notes.Plan || '').toLowerCase();
      if (planStr === 'test') {
        plan = 'test';
      } else if (planStr === 'pro') {
        plan = 'pro';
      } else if (planStr === 'mega') {
        plan = 'mega';
      }
    }

    if (!plan) {
      console.error('PLAN_MAPPING_FAILED');
      console.error(`VALIDATION FAILED reason=plan_mapping_failed details="payment_link_id: ${receivedPaymentLinkId}"`);
      await logSystemError('webhook_error', 'Plan mapping failed', `payment_link_id: ${receivedPaymentLinkId}`);
      return res.status(400).json({ error: 'Plan mapping failed. Rejecting request.' });
    }

    const amountPaisa = paymentPayload?.amount ?? paymentLinkPayload?.amount ?? 0;
    const amount = amountPaisa / 100; // Razorpay tracks in paisa
    const currency = paymentPayload?.currency || paymentLinkPayload?.currency || 'INR';

    // 7. Upsert User
    const { error: userError } = await supabase
      .from('users')
      .upsert({ email }, { onConflict: 'email' });

    if (userError) {
      console.error('[razorpay-webhook] User upsert error:', userError);
      console.error('VALIDATION FAILED reason=user_upsert_error details=' + userError?.message);
      await logSystemError('webhook_error', 'User upsert error', userError?.message);
      return res.status(500).json({ error: 'Failed to upsert user record.' });
    }
    console.log('USER INSERTED');

    // 8. Generate License Key
    let prefix: 'PR' | 'MG' | 'TS' = 'PR';
    if (plan === 'test') {
      prefix = 'TS';
    } else if (plan === 'mega') {
      prefix = 'MG';
    }
    const licenseKey = generateRandomKey(prefix);
    console.log(`[ADMIN LOG] License generated: ${licenseKey} (Plan: ${plan})`);

    // 9. Compute expiration duration (Pro = 30 days, Mega = 365 days, Test = 1 day)
    const expiresAt = new Date();
    if (plan === 'test') {
      expiresAt.setDate(expiresAt.getDate() + 1);
    } else if (plan === 'mega') {
      expiresAt.setDate(expiresAt.getDate() + 365);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

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
      console.error('VALIDATION FAILED reason=license_insert_error details=' + licenseError?.message);
      await logSystemError('webhook_error', 'License insert error', licenseError?.message);
      return res.status(500).json({ error: 'Failed to generate license record.' });
    }
    console.log('LICENSE INSERTED');

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
    } else {
      console.log('PAYMENT INSERTED');
    }

    console.log('[ADMIN LOG] Database insert: User, License, and Payment saved successfully');

    // 12. Email delivery of license key
    const emailSent = await sendLicenseEmail(email, licenseKey, plan, expiresAt);
    if (!emailSent) {
      console.warn(`[razorpay-webhook] Failed to send license key email to ${email}. Check Resend configuration.`);
      await logSystemError('email_error', `Failed to send license key email to ${email}`, `License: ${licenseKey}, Plan: ${plan}`);
    } else {
      console.log(`[ADMIN LOG] Email sent successfully to ${email}`);
      console.log('EMAIL SENT');
    }

    console.log(`[razorpay-webhook] Successfully processed payment ${paymentId} and generated license ${licenseKey} for ${email}`);
    console.log('VALIDATION SUCCESS');
    
    return res.status(200).json({
      success: true,
      licenseKey,
      plan,
      email,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (err: any) {
    console.error('[razorpay-webhook] Processing failed:', err);
    console.error('VALIDATION FAILED reason=internal_exception details=' + err?.message);
    await logSystemError('webhook_error', 'Internal server exception', err?.message);
    return res.status(500).json({ error: 'Internal processing error.', details: err?.message });
  }
}
