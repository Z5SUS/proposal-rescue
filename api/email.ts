/**
 * Email Delivery Utility — Resend Integration
 */
console.log('EMAIL MODULE LOADED');

interface RecoveredLicense {
  license_key: string;
  plan: 'pro' | 'mega' | 'test' | 'owner';
  status: string;
  expires_at: string | null;
}

export async function sendLicenseEmail(
  email: string,
  licenseKey: string,
  plan: 'pro' | 'mega' | 'test',
  expiresAt: Date
): Promise<boolean> {
  console.log(`EMAIL_ATTEMPTED recipient=${email} licenseKey=${licenseKey}`);

  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.EMAIL_FROM || 'Proposal Rescue <onboarding@resend.dev>';

  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  if (!apiKey) {
    if (isProduction) {
      console.error('EMAIL_CONFIGURATION_ERROR reason=missing_resend_api_key_in_production');
      console.error(`EMAIL_FAILED recipient=${email} licenseKey=${licenseKey} error=missing_resend_api_key`);
      return false;
    }
    console.warn('[email] RESEND_API_KEY is not set. Simulation mode active.');
  }

  const subject = plan === 'test' ? 'Proposal Rescue Test License' : 'Your Proposal Rescue License';
  const planName = plan === 'test' ? 'Developer Test' : plan === 'mega' ? 'Mega' : 'Pro';
  const formattedExpiry = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }) + ' (UTC)';

  const greeting = plan === 'test'
    ? 'Thank you for testing Proposal Rescue.'
    : 'Thank you for purchasing Proposal Rescue.';

  const instructionsHtml = `<ol>
    <li>Open Chrome Extension settings (click the Proposal Rescue icon).</li>
    <li>Copy and paste your license key: <code>${licenseKey}</code></li>
    <li>Click <strong>Validate</strong> to activate your license.</li>
  </ol>`;

  const instructionsText = `1. Open Chrome Extension settings (click the Proposal Rescue icon).
2. Copy and paste your license key: ${licenseKey}
3. Click Validate to activate your license.`;

  const bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #2563eb; margin-top: 0;">Proposal Rescue Activated!</h2>
      <p>${greeting}</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>License Key:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px;">${licenseKey}</code></p>
        <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
        <p style="margin: 5px 0;"><strong>Expires At:</strong> ${formattedExpiry}</p>
      </div>
      <h3 style="margin-bottom: 10px;">Activation Instructions:</h3>
      ${instructionsHtml}
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">If you have any questions, please contact support.</p>
    </div>
  `;

  if (!apiKey) {
    console.log(`[email] Simulated email to ${email}:
Subject: ${subject}
Body:
${greeting}

License Key: ${licenseKey}
Plan: ${planName}
Expires At: ${formattedExpiry}

Instructions:
${instructionsText}`);
    console.log(`EMAIL_SUCCESS recipient=${email} licenseKey=${licenseKey} (simulated)`);
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html: bodyHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[email] Resend API error (HTTP ${res.status}):`, errorText);
      console.error(`EMAIL_FAILED recipient=${email} licenseKey=${licenseKey} error=${errorText}`);
      return false;
    }

    const data = await res.json();
    console.log('[email] Resend response:', data);
    console.log(`EMAIL_SUCCESS recipient=${email} licenseKey=${licenseKey}`);
    return true;
  } catch (err: any) {
    console.error('[email] Exception sending email via Resend:', err);
    console.error(`EMAIL_FAILED recipient=${email} licenseKey=${licenseKey} error=${err?.message || err}`);
    return false;
  }
}

export async function sendRecoveryEmail(
  email: string,
  licenses: RecoveredLicense[]
): Promise<boolean> {
  console.log(`EMAIL_ATTEMPTED recipient=${email} type=recovery`);

  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.EMAIL_FROM || 'Proposal Rescue <onboarding@resend.dev>';

  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  if (!apiKey) {
    if (isProduction) {
      console.error('EMAIL_CONFIGURATION_ERROR reason=missing_resend_api_key_in_production_recovery');
      console.error(`EMAIL_FAILED recipient=${email} type=recovery error=missing_resend_api_key`);
      return false;
    }
    console.warn('[email] RESEND_API_KEY is not set. Simulation mode active for recovery.');
  }

  const subject = 'Your Proposal Rescue License Keys';

  const licensesListHtml = licenses.map(l => {
    const planName = l.plan === 'test' ? 'Developer Test' : l.plan === 'mega' ? 'Mega' : l.plan === 'pro' ? 'Pro' : 'Owner';
    const expiryStr = l.expires_at 
      ? new Date(l.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) + ' (UTC)'
      : 'Lifetime';
    const statusColor = l.status === 'active' ? '#10b981' : '#ef4444';

    return `
      <li style="margin-bottom: 15px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; list-style-type: none;">
        <p style="margin: 3px 0;"><strong>License Key:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${l.license_key}</code></p>
        <p style="margin: 3px 0;"><strong>Plan:</strong> ${planName}</p>
        <p style="margin: 3px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${l.status}</span></p>
        <p style="margin: 3px 0;"><strong>Expires At:</strong> ${expiryStr}</p>
      </li>
    `;
  }).join('');

  const bodyHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="color: #2563eb; margin-top: 0;">Recovered License Keys</h2>
      <p>Here are all the license keys associated with your email address:</p>
      <ul style="padding: 0; margin: 20px 0;">
        ${licensesListHtml}
      </ul>
      <h3 style="margin-bottom: 10px;">Activation Instructions:</h3>
      <ol>
        <li>Open Chrome Extension settings (click the Proposal Rescue icon).</li>
        <li>Copy and paste your active license key.</li>
        <li>Click <strong>Validate</strong> to activate.</li>
      </ol>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">If you have any questions, please contact support.</p>
    </div>
  `;

  if (!apiKey) {
    console.log(`[email] Simulated recovery email to ${email}:
Subject: ${subject}
Body:
${licenses.map(l => `Key: ${l.license_key} | Plan: ${l.plan} | Status: ${l.status} | Expires: ${l.expires_at}`).join('\n')}`);
    console.log(`EMAIL_SUCCESS recipient=${email} type=recovery (simulated)`);
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject,
        html: bodyHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[email] Resend API error (HTTP ${res.status}):`, errorText);
      console.error(`EMAIL_FAILED recipient=${email} type=recovery error=${errorText}`);
      return false;
    }

    const data = await res.json();
    console.log('[email] Resend recovery response:', data);
    console.log(`EMAIL_SUCCESS recipient=${email} type=recovery`);
    return true;
  } catch (err: any) {
    console.error('[email] Exception sending recovery email via Resend:', err);
    console.error(`EMAIL_FAILED recipient=${email} type=recovery error=${err?.message || err}`);
    return false;
  }
}


