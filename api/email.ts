/**
 * Email Delivery Utility — Resend Integration
 */

export async function sendLicenseEmail(
  email: string,
  licenseKey: string,
  plan: 'pro' | 'mega'
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.EMAIL_FROM || 'Proposal Rescue <onboarding@resend.dev>';

  const subject = 'Your Proposal Rescue License';
  const planName = plan === 'mega' ? 'Mega' : 'Pro';

  const bodyHtml = `
    <p>Thank you for purchasing Proposal Rescue.</p>
    <p><strong>License Key:</strong> <code>${licenseKey}</code></p>
    <p><strong>Plan:</strong> ${planName}</p>
    <p><strong>Instructions:</strong></p>
    <ol>
      <li>Open Extension Settings</li>
      <li>Paste License Key</li>
      <li>Click Validate</li>
    </ol>
  `;

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY is not set. Simulation mode active.');
    console.log(`[email] Simulated email to ${email}:
Subject: ${subject}
Body:
Thank you for purchasing Proposal Rescue.
License Key: ${licenseKey}
Plan: ${planName}
Instructions:
1. Open Extension Settings
2. Paste License Key
3. Click Validate`);
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
      return false;
    }

    const data = await res.json();
    console.log('[email] Resend response:', data);
    return true;
  } catch (err) {
    console.error('[email] Exception sending email via Resend:', err);
    return false;
  }
}
