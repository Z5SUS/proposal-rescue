import crypto from 'crypto';

const targetUrl = process.argv[2] || 'http://localhost:3000/api/razorpay-webhook';
const webhookSecret = process.argv[3] || ''; // Optional: Pass your RAZORPAY_WEBHOOK_SECRET to test signature verification

async function sendMockPayment() {
  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_test_${Math.floor(Math.random() * 1000000)}`,
          email: 'customer_verify@proposalrescue.com',
          amount: 290000, // Rs 2900 (Mega Plan)
          currency: 'INR',
          description: 'Proposal Rescue Mega Subscription'
        }
      }
    }
  };

  const bodyStr = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
  };

  // If a secret is provided, generate a valid signature
  if (webhookSecret) {
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex');
    headers['x-razorpay-signature'] = signature;
    console.log(`Using calculated signature: ${signature}`);
  }

  console.log(`Sending mock payment.captured event to ${targetUrl}...`);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyStr,
    });

    console.log(`Response Status: ${response.status}`);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ Verification successful! License generated and database updated.');
      console.log(`License Key: ${data.licenseKey}`);
      console.log(`Expires At: ${data.expiresAt}`);
    } else {
      console.error('\n❌ Verification failed. Check Vercel logs or terminal output.');
    }
  } catch (err) {
    console.error('Error sending request:', err);
  }
}

sendMockPayment();
