/**
 * Short-lived download tickets. A ticket is not a bearer URL: the download endpoint also
 * requires the same authenticated session, re-checks grants/revocation on every request
 * and reads the object key from the server registry. The ticket carries no internal IDs,
 * only a digest of (user, session), the item, the release hash, expiry and a nonce.
 */
export interface DownloadTicket {binding: string; itemId: string; sha256: string; expiresAt: number}

export const downloadTicketSeconds = 120;
const encoder = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
function fromB64url(value: string) {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(value)) return null;
  try {return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));} catch {return null;}
}
async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}

/** Session-bound digest; logout or session revocation makes every issued ticket useless. */
export const ticketBinding = (userId: string, sessionId: string) => sha256(`tallshift/download-binding/v1|${userId}|${sessionId}`);

/** Derives a dedicated signing key from the auth secret (key separation by label). */
export async function createDownloadTickets(authSecret: string) {
  if (typeof authSecret !== 'string' || authSecret.length < 32) throw new Error('DOWNLOAD_SECRET_REQUIRED');
  const master = await crypto.subtle.importKey('raw', encoder.encode(authSecret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const derived = await crypto.subtle.sign('HMAC', master, encoder.encode('tallshift/download-ticket/v1'));
  const key = await crypto.subtle.importKey('raw', derived, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
  return {
    async sign(ticket: DownloadTicket) {
      if (!/^[a-f0-9]{64}$/.test(ticket.binding) || !/^[SCEA]\d{3}$/.test(ticket.itemId) || !/^[a-f0-9]{64}$/.test(ticket.sha256) || !Number.isSafeInteger(ticket.expiresAt) || ticket.expiresAt <= 0) throw new Error('INVALID_TICKET');
      const nonce = b64url(crypto.getRandomValues(new Uint8Array(12)));
      const payload = b64url(encoder.encode(JSON.stringify({b: ticket.binding, i: ticket.itemId, r: ticket.sha256, e: ticket.expiresAt, n: nonce})));
      const signature = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`v1.${payload}`))));
      return `v1.${payload}.${signature}`;
    },
    /** Returns the ticket only if the signature is valid, it has not expired and its lifetime is bounded. */
    async verify(token: string, now: number): Promise<DownloadTicket | null> {
      if (typeof token !== 'string' || token.length > 600) return null;
      const parts = token.split('.');
      if (parts.length !== 3 || parts[0] !== 'v1') return null;
      const payloadBytes = fromB64url(parts[1]), signature = fromB64url(parts[2]);
      if (!payloadBytes || !signature || signature.length !== 32) return null;
      if (!await crypto.subtle.verify('HMAC', key, signature, encoder.encode(`v1.${parts[1]}`))) return null;
      let value: unknown;
      try {value = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(payloadBytes));} catch {return null;}
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'b,e,i,n,r') return null;
      const {b, e, i, r} = value as Record<string, unknown>;
      if (typeof b !== 'string' || !/^[a-f0-9]{64}$/.test(b) || typeof i !== 'string' || !/^[SCEA]\d{3}$/.test(i) || typeof r !== 'string' || !/^[a-f0-9]{64}$/.test(r) || !Number.isSafeInteger(e)) return null;
      const expiresAt = e as number;
      if (expiresAt <= now || expiresAt - now > downloadTicketSeconds) return null;
      return {binding: b, itemId: i, sha256: r, expiresAt};
    },
  };
}
export type DownloadTicketSigner = Awaited<ReturnType<typeof createDownloadTickets>>;
