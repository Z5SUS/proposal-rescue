/**
 * Email Delivery Utility — Resend Integration
 */
console.log('EMAIL MODULE LOADED');

export async function sendLicenseEmail(
  email: string,
  licenseKey: string,
  plan: 'pro' | 'mega' | 'test'
): Promise<boolean> {
  console.log(`EMAIL_ATTEMPTED recipient=${email} licenseKey=${licenseKey}`);

  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.EMAIL_FROM || 'Proposal Rescue <onboarding@resend.dev>';

  const subject = plan === 'test' ? 'Proposal Rescue Test License' : 'Your Proposal Rescue License';
  const planName = plan === 'test' ? 'Developer Test' : plan === 'mega' ? 'Mega' : 'Pro';
  const validDuration = plan === 'test' ? '1 Day' : plan === 'mega' ? '365 Days' : '30 Days';

  const greeting = plan === 'test'
    ? 'Thank you for testing Proposal Rescue.'
    : 'Thank you for purchasing Proposal Rescue.';

  const instructionsHtml = plan === 'test'
    ? `<ol>
      <li>Open Proposal Rescue Settings.</li>
      <li>Enter the license.</li>
      <li>Click Validate License.</li>
    </ol>`
    : `<ol>
      <li>Open Extension Settings</li>
      <li>Paste License Key</li>
      <li>Click Validate</li>
    </ol>`;

  const instructionsText = plan === 'test'
    ? `1. Open Proposal Rescue Settings.
2. Enter the license.
3. Click Validate License.`
    : `1. Open Extension Settings
2. Paste License Key
3. Click Validate`;

  const bodyHtml = `
    <p>${greeting}</p>
    <p><strong>License Key:</strong> <code>${licenseKey}</code></p>
    <p><strong>Plan:</strong> ${planName}</p>
    <p><strong>Valid For:</strong> ${validDuration}</p>
    <p><strong>Instructions:</strong></p>
    ${instructionsHtml}
  `;

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (!apiKey) {
    if (isProduction) {
      console.error('EMAIL_CONFIGURATION_ERROR reason=missing_resend_api_key');
      console.error(`EMAIL_FAILED recipient=${email} licenseKey=${licenseKey} error=missing_resend_api_key`);
      return false;
    }

    console.warn('[email] RESEND_API_KEY is not set. Simulation mode active.');
    console.log(`[email] Simulated email to ${email}:
Subject: ${subject}
Body:
${greeting}

License Key:
${licenseKey}

Plan:
${planName}

Valid For:
${validDuration}

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

