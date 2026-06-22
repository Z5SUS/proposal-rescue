import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OWNER_KEYS = (process.env.OWNER_KEYS ?? 'Z5-OWNER').split(',').map((k) => k.trim());

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

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed. Use GET.');
  }

  const key = req.query.key as string;
  if (!key || !OWNER_KEYS.includes(key)) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>401 Unauthorized</title>
          <style>
            body { background: #0f172a; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; padding: 24px; border-radius: 12px; text-align: center; max-width: 320px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
            h1 { font-size: 20px; color: #ef4444; margin-top: 0; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>401 Unauthorized</h1>
            <p>Access Denied. A valid owner key must be provided in the query string (e.g., <code>?key=YOUR_KEY</code>).</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const supabase = getSupabase();

    // 1. Fetch counts
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activePro } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .eq('status', 'active');

    const { count: activeMega } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'mega')
      .eq('status', 'active');

    const { count: expiredLicenses } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired');

    // 2. Fetch payments & total revenue
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'paid');
    const totalRevenue = (paymentsData || []).reduce((acc: number, p: any) => acc + parseFloat(p.amount), 0);

    // 3. Fetch recent tables
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: webhookErrors } = await supabase
      .from('system_logs')
      .select('*')
      .eq('type', 'webhook_error')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: emailErrors } = await supabase
      .from('system_logs')
      .select('*')
      .eq('type', 'email_error')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentActivations } = await supabase
      .from('system_logs')
      .select('*')
      .eq('type', 'license_activation')
      .order('created_at', { ascending: false })
      .limit(10);

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proposal Rescue Admin Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-gradient: linear-gradient(135deg, #0b0f19 0%, #111827 100%);
            --card-bg: rgba(30, 41, 59, 0.45);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --brand-glow: 0 0 20px rgba(99, 102, 241, 0.25);
            --accent-green: #10b981;
            --accent-blue: #3b82f6;
            --accent-amber: #f59e0b;
            --accent-red: #ef4444;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: var(--bg-gradient);
            color: var(--text-primary);
            font-family: 'Outfit', sans-serif;
            min-height: 100vh;
            padding: 40px 20px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 1px solid var(--card-border);
            padding-bottom: 20px;
          }
          .logo-area { display: flex; align-items: center; gap: 12px; }
          .logo-dot { width: 14px; height: 14px; background: #6366f1; border-radius: 50%; box-shadow: 0 0 12px #6366f1; }
          h1 { font-size: 24px; font-weight: 700; }
          .badge {
            background: rgba(99, 102, 241, 0.15);
            color: #818cf8;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid rgba(99, 102, 241, 0.2);
          }
          
          /* Metrics Grid */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }
          .metric-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(12px);
            box-shadow: 0 4px 30px rgba(0,0,0,0.15);
            transition: transform 0.2s, border-color 0.2s;
          }
          .metric-card:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.15);
          }
          .metric-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; tracking-wider: 0.05em; }
          .metric-value { font-size: 32px; font-weight: 700; margin-top: 8px; }
          
          /* Colors */
          .val-revenue { color: var(--accent-amber); text-shadow: 0 0 10px rgba(245, 158, 11, 0.2); }
          .val-users { color: var(--accent-green); }
          .val-pro { color: var(--accent-blue); }
          .val-mega { color: var(--accent-amber); }
          .val-expired { color: var(--accent-red); }

          /* Sections */
          .section-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 30px;
            margin-bottom: 40px;
          }
          @media(min-width: 900px) {
            .section-grid { grid-template-columns: 1fr 1fr; }
          }
          .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(12px);
            box-shadow: 0 4px 30px rgba(0,0,0,0.15);
            display: flex;
            flex-content: column;
            flex-direction: column;
          }
          .card-title { font-size: 16px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
          .card-title span.count-pill { font-size: 11px; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 99px; }

          /* Tables */
          table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
          th { color: var(--text-secondary); font-weight: 600; padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
          td { padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--text-primary); vertical-align: middle; }
          tr:hover td { background: rgba(255,255,255,0.02); }
          .font-mono { font-family: monospace; font-size: 12px; color: #818cf8; }
          
          /* Status states */
          .status-tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .status-pro { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
          .status-mega { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
          .status-test { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
          
          .empty-state { text-align: center; color: var(--text-secondary); padding: 40px 0; font-size: 13px; }
          .error-msg { color: var(--accent-red); font-weight: 500; font-size: 12px; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <div class="logo-area">
              <div class="logo-dot"></div>
              <h1>Proposal Rescue</h1>
            </div>
            <span class="badge">Admin System Health</span>
          </header>

          <!-- 1. Metrics -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Total Revenue</div>
              <div class="metric-value val-revenue">₹${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Total Users</div>
              <div class="metric-value val-users">${totalUsers ?? 0}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Active Pro</div>
              <div class="metric-value val-pro">${activePro ?? 0}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Active Mega</div>
              <div class="metric-value val-mega">${activeMega ?? 0}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Expired Licenses</div>
              <div class="metric-value val-expired">${expiredLicenses ?? 0}</div>
            </div>
          </div>

          <!-- 2. Section Lists -->
          <div class="section-grid">
            <!-- Recent Payments -->
            <div class="card">
              <div class="card-title">
                Recent Checkout Payments
                <span class="count-pill">Last 10</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Email / Key</th>
                    <th>Plan</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(recentPayments || []).length === 0 ? '<tr><td colspan="4" class="empty-state">No payment logs recorded.</td></tr>' : 
                    recentPayments.map(p => `
                      <tr>
                        <td class="font-mono">${p.payment_id}</td>
                        <td>
                          <span style="display:block; font-size:12px; color:var(--text-primary);">${p.license_key}</span>
                        </td>
                        <td><span class="status-tag status-${p.plan}">${p.plan}</span></td>
                        <td style="font-weight:600; color:var(--accent-green);">₹${p.amount}</td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>

            <!-- Recent Activations -->
            <div class="card">
              <div class="card-title">
                Recent Activations
                <span class="count-pill">Last 10</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Activated Key</th>
                    <th>User Detail</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${(recentActivations || []).length === 0 ? '<tr><td colspan="3" class="empty-state">No activations recorded.</td></tr>' : 
                    recentActivations.map(a => {
                      let details = { plan: '', email: '' };
                      try { details = JSON.parse(a.details); } catch(e) {}
                      return `
                        <tr>
                          <td class="font-mono">${a.message.replace('License validated: ', '')}</td>
                          <td>
                            <span style="display:block; font-size:12px; color:var(--text-primary);">${details.email || 'n/a'}</span>
                            <span style="font-size:10px; color:var(--text-secondary);">${details.plan ? details.plan.toUpperCase() : 'n/a'}</span>
                          </td>
                          <td style="color:var(--text-secondary); font-size:11px;">${new Date(a.created_at).toLocaleString()}</td>
                        </tr>
                      `;
                    }).join('')
                  }
                </tbody>
              </table>
            </div>

            <!-- Webhook Errors -->
            <div class="card">
              <div class="card-title" style="color:var(--accent-red);">
                Webhook Failure Log
                <span class="count-pill">Last 10</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Log Message</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${(webhookErrors || []).length === 0 ? '<tr><td colspan="3" class="empty-state">No webhook failures recorded.</td></tr>' : 
                    webhookErrors.map(w => `
                      <tr>
                        <td style="font-weight:600; color:var(--text-primary);">${w.message}</td>
                        <td class="error-msg">${w.details || 'n/a'}</td>
                        <td style="color:var(--text-secondary); font-size:11px; white-space:nowrap;">${new Date(w.created_at).toLocaleTimeString()}</td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>

            <!-- Email Errors -->
            <div class="card">
              <div class="card-title" style="color:var(--accent-red);">
                Resend Email Failure Log
                <span class="count-pill">Last 10</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Log Message</th>
                    <th>Details</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${(emailErrors || []).length === 0 ? '<tr><td colspan="3" class="empty-state">No email delivery failures recorded.</td></tr>' : 
                    emailErrors.map(e => `
                      <tr>
                        <td style="font-weight:600; color:var(--text-primary);">${e.message}</td>
                        <td class="error-msg">${e.details || 'n/a'}</td>
                        <td style="color:var(--text-secondary); font-size:11px; white-space:nowrap;">${new Date(e.created_at).toLocaleTimeString()}</td>
                      </tr>
                    `).join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (err: any) {
    console.error('[admin-dashboard] Fatal retrieval error:', err);
    return res.status(500).send(`<h1>500 Internal Server Error</h1><p>${err?.message || err}</p>`);
  }
}
