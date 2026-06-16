import { GMAIL_SELECTORS } from '@/constants';

// ─── Thread ID Extraction ─────────────────────────────────────────────────────

/**
 * Extracts the Gmail thread ID from the current URL.
 *
 * Gmail URLs follow these patterns depending on the view:
 *
 *   Inbox / label:
 *     #inbox/18b3e2fcd8a1f20c                    (16-char hex)
 *     #label/proposals/18b3e2fcd8a1f20c
 *
 *   Search results (the tricky case):
 *     #search/in:sent/FMfcgzQbfJgtdlhdBrJGjmLqqqjmBvjk  (longer base64-like)
 *     #search/query/18b3e2fcd8a1f20c
 *
 *   Sent / All Mail:
 *     #sent/18b3e2fcd8a1f20c
 *     #all/18b3e2fcd8a1f20c
 *
 * Rules:
 *   - The thread ID is always the LAST segment after the final '/'.
 *   - It is at least 8 characters long.
 *   - It only contains alphanumeric chars (hex uses [0-9a-f],
 *     search-view IDs use [A-Za-z0-9+/=]).
 *   - We exclude short segments like label names that could be
 *     mistaken for IDs (e.g. "sent", "inbox", "starred").
 *
 * IMPORTANT: We also accept the longer base64-style IDs Gmail uses
 * when opening threads from search results.
 */
export function extractThreadId(url: string = window.location.href): string | null {
  let hash: string;
  try {
    hash = new URL(url).hash; // e.g. "#search/in:sent/FMfcgzQ..."
  } catch {
    return null;
  }

  // Remove the leading '#'
  const fragment = hash.slice(1);
  const segments = fragment.split('/');
  const last = segments[segments.length - 1];

  if (!last) return null;

  // Must be at least 8 chars to avoid matching short label names
  if (last.length < 8) return null;

  // Standard 16-char hex thread ID (inbox, label, sent views)
  if (/^[0-9a-f]{16}$/i.test(last)) return last;

  // Longer alphanumeric IDs used in search-result thread views.
  // These can be 20–64 chars and include uppercase letters.
  // They always start with a capital letter when from search results.
  if (/^[A-Za-z0-9_\-+/]{16,}$/.test(last)) return last;

  console.debug('[ProposalRescue] Segment rejected as thread ID:', last, '| full hash:', hash);
  return null;
}

/**
 * Returns true if the current page is displaying a Gmail thread view.
 * Uses both URL analysis and DOM presence as a fallback.
 */
export function isThreadView(): boolean {
  if (extractThreadId() !== null) return true;
  // DOM fallback: the subject h2 only exists when a thread is open
  return document.querySelector<HTMLElement>(GMAIL_SELECTORS.THREAD_HEADER) !== null;
}

// ─── Thread Metadata Extraction ───────────────────────────────────────────────

/**
 * Reads the thread subject using multiple fallback strategies.
 *
 * Strategy 1: h2.hP  — standard Gmail subject heading
 * Strategy 2: document.title  — Gmail sets the tab title to the subject.
 *             Format: "Subject - user@gmail.com - Gmail"
 * Strategy 3: [data-thread-id] ancestor's aria-label
 */
export function extractSubject(): string {
  // Strategy 1: DOM element
  const el = document.querySelector<HTMLElement>('h2.hP');
  if (el?.textContent?.trim()) return el.textContent.trim();

  // Strategy 2: Page title (most reliable — Gmail always sets it)
  const title = document.title ?? '';
  if (title && title !== 'Gmail') {
    // Title format: "Subject - user@gmail.com - Gmail"
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      const subject = parts.slice(0, parts.length - 2).join(' - ').trim();
      if (subject) return subject;
      // Simpler: just take the first part
      return parts[0].trim();
    }
    return title;
  }

  return '(No subject)';
}

/**
 * Extracts the name and email of the primary external participant.
 *
 * Gmail renders sender info in elements with class .gD that have
 * an "email" attribute. We skip the logged-in user and return the
 * first external contact.
 *
 * Fallback chain:
 *   .gD[email]  →  [email]  →  span[data-hovercard-id]  →  Unknown
 */
export function extractParticipant(): { name: string; email: string } {
  const userEmail = getUserEmail();

  // Strategy 1: .gD elements (standard Gmail sender spans)
  const gDEls = document.querySelectorAll<HTMLElement>('.gD');
  for (const el of gDEls) {
    const email = el.getAttribute('email') ?? '';
    const name =
      el.getAttribute('name') ??
      el.textContent?.trim() ??
      email.split('@')[0];
    if (email && email.toLowerCase() !== userEmail.toLowerCase()) {
      return { name: name || email, email };
    }
  }

  // Strategy 2: Any element with an email attribute
  const emailEls = document.querySelectorAll<HTMLElement>('[email]');
  for (const el of emailEls) {
    const email = el.getAttribute('email') ?? '';
    const name = el.getAttribute('name') ?? el.textContent?.trim() ?? '';
    if (email && email.toLowerCase() !== userEmail.toLowerCase()) {
      return { name: name || email.split('@')[0], email };
    }
  }

  // Strategy 3: data-hovercard-id (sometimes used for contact hover cards)
  const hoverEls = document.querySelectorAll<HTMLElement>('[data-hovercard-id]');
  for (const el of hoverEls) {
    const email = el.getAttribute('data-hovercard-id') ?? '';
    if (email.includes('@') && email.toLowerCase() !== userEmail.toLowerCase()) {
      return { name: el.textContent?.trim() || email.split('@')[0], email };
    }
  }

  return { name: 'Unknown', email: '' };
}

/**
 * Returns the logged-in user's email address.
 *
 * Fallback chain:
 *   <meta itemprop="email">  →  URL path (/u/0/ user index lookup)  →  ''
 */
export function getUserEmail(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[itemprop="email"]');
  if (meta?.content) return meta.content;

  // Fallback: profile image alt text sometimes contains the email
  const profileImg = document.querySelector<HTMLImageElement>(
    'img[data-cid="bhc"]',
  );
  if (profileImg?.alt?.includes('@')) return profileImg.alt;

  return '';
}

/**
 * Detects whether the user was the LAST sender in the thread.
 */
export function userSentLast(): boolean {
  const userEmail = getUserEmail();
  if (!userEmail) return false;

  const senderEls = document.querySelectorAll<HTMLElement>('.gD[email]');
  if (!senderEls.length) return false;

  const lastEmail =
    senderEls[senderEls.length - 1]?.getAttribute('email') ?? '';
  return lastEmail.toLowerCase() === userEmail.toLowerCase();
}

/**
 * Finds the best DOM element to inject our track card after.
 *
 * Tries several known stable Gmail containers in priority order:
 *   1. The div containing the subject h2 — right below the subject
 *   2. The first .adn message container — above the first message
 *   3. The [role="main"] container — last resort
 */
export function findInjectionPoint(): Element | null {
  // Strategy 1: Find the subject h2 and walk up to a good container
  const subjectEl = document.querySelector('h2.hP');
  if (subjectEl) {
    // Walk up max 6 levels to find a sibling-able container
    let el: Element | null = subjectEl;
    for (let i = 0; i < 6; i++) {
      const parent: HTMLElement | null = el?.parentElement ?? null;
      if (!parent) break;
      // Stop at a div that has a next sibling — good injection point
      if (parent.nextElementSibling && parent.tagName === 'DIV') {
        return parent;
      }
      el = parent;
    }
  }

  // Strategy 2: Insert before the first message block
  const firstMsg = document.querySelector('.adn.ads');
  if (firstMsg) return firstMsg.parentElement;

  // Strategy 3: Insert into the thread container
  const threadView = document.querySelector('[role="main"]');
  return threadView ?? null;
}

/**
 * Extracts the last few visible message snippets from the thread.
 */
export function extractMessageSnippets(maxMessages = 3): string[] {
  const messages = document.querySelectorAll<HTMLElement>('.adn.ads');
  const snippets: string[] = [];
  const slice = Array.from(messages).slice(-maxMessages);
  for (const msg of slice) {
    const text = msg.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (text) snippets.push(text.slice(0, 500));
  }
  return snippets;
}
