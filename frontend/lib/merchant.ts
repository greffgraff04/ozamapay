// Cleans up StroWallet's raw card-network merchant descriptors (e.g.
// "ANTHROPIC* CLAUDE SUB +14152360599 CAUS", "FACEBK *QWEMSY5HQ2 FACEBOOK.COM IE")
// into a display name and a best-effort domain for a Clearbit logo lookup.
const DOMAIN_RE = /([a-z0-9-]+)\.(?:com|net|org|io|co|us|ie|fr|ca|uk)\b/i;
const NOISE_WORDS = new Set(['SUB', 'INC', 'LLC', 'LTD', 'CORP', 'CO']);

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function parseMerchant(
  merchant?: string | null,
  narrative?: string | null,
): { displayName: string; domain: string | null } {
  const raw = (merchant || narrative || '').trim();
  if (!raw) return { displayName: 'Peman Kat', domain: null };

  // A literal domain in the descriptor is the most reliable signal — it also
  // sidesteps abbreviated brand codes and reference numbers entirely.
  const domainMatch = raw.match(DOMAIN_RE);
  if (domainMatch) {
    const name = titleCase(domainMatch[1]);
    return { displayName: name, domain: `${domainMatch[1].toLowerCase()}.com` };
  }

  let words = raw.split(/\s+/).map((w) => w.replace(/\*/g, '')).filter(Boolean);

  // Phone numbers
  words = words.filter((w) => !/^\+?\d[\d-]{6,}$/.test(w));

  // Trailing short all-caps location/country code (e.g. CAUS, IE, DEUS)
  if (words.length > 1 && /^[A-Z]{2,5}$/.test(words[words.length - 1])) {
    words = words.slice(0, -1);
  }

  // Alphanumeric reference codes (mix of letters+digits, 5+ chars) — e.g. QWEMSY5HQ2
  words = words.filter((w) => !(/[a-z]/i.test(w) && /\d/.test(w) && w.length >= 5));

  // Generic business-descriptor noise
  words = words.filter((w) => !NOISE_WORDS.has(w.toUpperCase()));

  if (words.length === 0) return { displayName: 'Peman Kat', domain: null };

  const displayName = words.map(titleCase).join(' ');
  const domain = `${words[0].toLowerCase()}.com`;
  return { displayName, domain };
}
