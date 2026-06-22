import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseClient: any = null;
function getSupabase(): any {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are not set.');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

export function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }
  return (req.headers['x-real-ip'] as string) || '127.0.0.1';
}

export async function isRateLimited(
  ip: string,
  endpoint: string,
  limit: number,
  windowHours: number = 1
): Promise<boolean> {
  const now = new Date();
  const windowStartLimit = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  try {
    const supabase = getSupabase();
    
    // Query rate limit entry
    const { data, error } = await supabase
      .from('rate_limits')
      .select('id, request_count, window_start')
      .eq('ip', ip)
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (error) {
      console.error(`[RateLimit] Database error fetching rate limit:`, error);
      return false; // Fail open
    }

    if (!data) {
      // Create new rate limit record
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          ip,
          endpoint,
          request_count: 1,
          window_start: now.toISOString()
        });
      if (insertError) {
        console.error(`[RateLimit] Database error inserting rate limit:`, insertError);
      }
      return false;
    }

    const windowStart = new Date(data.window_start);

    if (windowStart < windowStartLimit) {
      // Window expired, reset count and time
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({
          request_count: 1,
          window_start: now.toISOString()
        })
        .eq('id', data.id);
      if (updateError) {
        console.error(`[RateLimit] Database error resetting rate limit window:`, updateError);
      }
      return false;
    }

    if (data.request_count >= limit) {
      console.warn(`[RateLimit] Blocked request from IP ${ip} on endpoint ${endpoint} (count: ${data.request_count})`);
      return true;
    }

    // Increment count
    const { error: incrementError } = await supabase
      .from('rate_limits')
      .update({
        request_count: data.request_count + 1
      })
      .eq('id', data.id);
    if (incrementError) {
      console.error(`[RateLimit] Database error incrementing rate limit:`, incrementError);
    }
    return false;

  } catch (err) {
    console.error(`[RateLimit] Unexpected error in rate limiter:`, err);
    return false; // Fail open
  }
}
