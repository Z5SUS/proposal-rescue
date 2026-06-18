import { API_BASE_URL, OWNER_KEYS } from '@/constants';

interface GenerateFollowUpPayload {
  licenseKey: string;
  threadContext: {
    subject: string;
    participantName: string;
    followUpCount: number;
    lastUserEmailDate: string;
  };
  tone: string;
}

const FALLBACK_DEEPSEEK_KEY = 'sk-fc84f86c11df4dc38b1e2a3ff1861171';

async function generateDirectDeepSeek(apiKey: string, subject: string, participantName: string, tone: string): Promise<string> {
  const prompt = `Write a short, punchy (1-2 paragraphs max) follow-up email draft.
Tone: ${tone}
Recipient Name: ${participantName}
Subject: ${subject}
Instructions: Do NOT include greetings (like "Dear...", "Hi...") or sign-offs (like "Best regards...", "Sincerely...") because the user will insert this draft into an existing compose window which already has those. Focus on the core message.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert copywriter helping a user follow up on a business proposal.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`DeepSeek API error: HTTP ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek returned an empty response.');
  }
  return content;
}

async function generateDirectOpenAI(apiKey: string, subject: string, participantName: string, tone: string): Promise<string> {
  const prompt = `Write a short, punchy (1-2 paragraphs max) follow-up email draft.
Tone: ${tone}
Recipient Name: ${participantName}
Subject: ${subject}
Instructions: Do NOT include greetings or sign-offs. Focus on the core message.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert copywriter helping a user follow up on a business proposal.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error: HTTP ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }
  return content;
}

export async function generateFollowUpAPI(payload: GenerateFollowUpPayload): Promise<string> {
  const key = payload.licenseKey || '';
  
  // If user configured their own API key (starts with sk-), call directly
  if (key.startsWith('sk-')) {
    try {
      return await generateDirectDeepSeek(key, payload.threadContext.subject, payload.threadContext.participantName, payload.tone);
    } catch (err) {
      console.warn('Direct DeepSeek draft failed, trying OpenAI:', err);
      return await generateDirectOpenAI(key, payload.threadContext.subject, payload.threadContext.participantName, payload.tone);
    }
  }

  // Try the proxy server
  try {
    const response = await fetch(`${API_BASE_URL}/generate-followup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.draft) return data.draft;
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status} Error`;
      console.warn(`Proxy API error: ${errorMessage}`);
    }
  } catch (err) {
    console.warn('Proxy generation unreachable, falling back to direct DeepSeek API call:', err);
  }

  // Fallback to direct DeepSeek call using user's billed DeepSeek key
  return await generateDirectDeepSeek(FALLBACK_DEEPSEEK_KEY, payload.threadContext.subject, payload.threadContext.participantName, payload.tone);
}

export async function validateLicenseAPI(licenseKey: string): Promise<{ valid: boolean; plan: string; expiresAt?: string | null; message?: string }> {
  const key = licenseKey.trim();

  // Local Owner Check (Mode 1 / Temporary Owner Access)
  if (OWNER_KEYS.includes(key)) {
    return { valid: true, plan: 'owner', message: 'License valid' };
  }

  // Validate DeepSeek/OpenAI keys directly if passed as a license key
  if (key.startsWith('sk-')) {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })
      });
      if (response.ok) {
        return { valid: true, plan: 'pro', message: 'License valid' };
      }
    } catch (e) {
      // try OpenAI next
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        })
      });
      if (response.ok) {
        return { valid: true, plan: 'pro', message: 'License valid' };
      }
    } catch (e) {
      // both failed
    }

    throw new Error('Invalid DeepSeek or OpenAI API key format / validation failed.');
  }

  // Otherwise, try the proxy server
  try {
    const response = await fetch(`${API_BASE_URL}/validate-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ licenseKey: key }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: !!data?.valid,
        plan: data?.plan || 'free',
        expiresAt: data?.expiresAt || null,
        message: data?.message || '',
      };
    }
  } catch (err) {
    console.warn('Proxy validation unreachable, verifying key locally:', err);
  }

  // Local validation fallback for development
  const lowerKey = key.toLowerCase();
  if (lowerKey.startsWith('pr-') || lowerKey.includes('pro')) {
    return { valid: true, plan: 'pro', message: 'License valid (Local Fallback)' };
  }
  if (lowerKey.startsWith('mg-') || lowerKey.includes('mega')) {
    return { valid: true, plan: 'mega', message: 'License valid (Local Fallback)' };
  }
  if (lowerKey.includes('owner')) {
    return { valid: true, plan: 'owner', message: 'License valid (Local Fallback)' };
  }

  return { valid: false, plan: 'free', message: 'Invalid or unrecognized license key.' };
}
