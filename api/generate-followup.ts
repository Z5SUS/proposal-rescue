import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadContext {
  subject: string;
  participantName: string;
  followUpCount: number;
  lastUserEmailDate: string;
}

interface GenerateFollowUpBody {
  licenseKey?: string;
  threadContext: ThreadContext;
  tone?: string;
}

// ─── Valid license plans that allow AI generation ─────────────────────────────
const PAID_PLANS = new Set(['pro', 'mega', 'owner']);

// ─── Owner Keys (same set as extension) ──────────────────────────────────────
const OWNER_KEYS = (process.env.OWNER_KEYS ?? 'Z5-OWNER').split(',').map((k) => k.trim());

// ─── Supabase Configuration ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

// ─── License Validation ───────────────────────────────────────────────────────
async function getPlanForLicense(licenseKey: string): Promise<string> {
  const key = (licenseKey ?? '').trim();
  if (!key) return 'free';
  if (OWNER_KEYS.includes(key)) return 'owner';

  try {
    const supabase = getSupabase();
    const { data: license, error } = await supabase
      .from('licenses')
      .select('plan, expires_at, status')
      .eq('license_key', key)
      .maybeSingle();

    if (error || !license) return 'free';
    if (license.status === 'expired' || license.status === 'cancelled') return 'free';

    // Expiry check
    if (license.expires_at) {
      const expiry = new Date(license.expires_at);
      if (Date.now() > expiry.getTime()) {
        // Asynchronously mark as expired in DB
        supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('license_key', key)
          .then(() => {});

        return 'free';
      }
    }

    return license.plan;
  } catch (err) {
    console.error('[generate-followup] Supabase license retrieval failed:', err);
    return 'free';
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

  const body = req.body as GenerateFollowUpBody;
  const { licenseKey = '', threadContext, tone = 'professional' } = body;

  // Validate body shape
  if (!threadContext?.subject || !threadContext?.participantName) {
    return res.status(400).json({ error: 'Missing required fields: threadContext.subject, threadContext.participantName' });
  }

  // Determine plan
  const plan = await getPlanForLicense(licenseKey);
  const isPaid = PAID_PLANS.has(plan);

  // Free users: no server-side AI generation (they use the 1 client-side trial)
  // Only paid / owner keys get unlimited server-side generation
  if (!isPaid) {
    return res.status(403).json({
      error: 'AI generation requires a Proposal Rescue Pro license.',
      upgrade_url: 'https://proposal-rescue.vercel.app/upgrade',
    });
  }

  // Require DeepSeek API key in environment
  const deepSeekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepSeekKey) {
    console.error('[generate-followup] DEEPSEEK_API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
  }

  // DeepSeek is OpenAI-API-compatible — just point to a different base URL
  const client = new OpenAI({
    apiKey: deepSeekKey,
    baseURL: 'https://api.deepseek.com',
  });

  const followUpLabel = threadContext.followUpCount >= 1 ? 'Second Follow-Up' : 'First Follow-Up';

  const prompt = `Write a short, punchy (1-2 paragraphs max) ${followUpLabel} email draft.
Tone: ${tone}
Recipient Name: ${threadContext.participantName}
Subject: ${threadContext.subject}
Last Contact: ${threadContext.lastUserEmailDate}
Instructions: Do NOT include greetings (like "Dear...", "Hi...") or sign-offs (like "Best regards...", "Sincerely...") because the user will insert this draft into an existing compose window which already has those. Focus on the core follow-up message only.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert business development copywriter helping a freelancer or consultant follow up on a submitted proposal. Write concise, confident, and human-sounding follow-up emails.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const draft = completion.choices[0]?.message?.content?.trim();
    if (!draft) {
      return res.status(500).json({ error: 'AI failed to generate a draft.' });
    }

    return res.status(200).json({ draft });
  } catch (err: any) {
    console.error('[generate-followup] API call failed:', err);
    return res.status(500).json({ error: 'Failed to generate follow-up draft.', details: err?.message });
  }
}
