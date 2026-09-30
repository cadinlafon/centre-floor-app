/** Deterministically obfuscate a UUID into a short URL-safe token, so raw user
 * ids aren't exposed in admin URLs like /admin/users/:token. Not cryptographic —
 * just avoids leaking sequential/guessable ids in links shared over chat/email. */
export function uidToToken(uid) {
  if (!uid) return '';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash) + uid.charCodeAt(i);
    hash |= 0;
  }
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  let n = Math.abs(hash);
  for (let i = 0; i < 10; i++) {
    token += chars[n % chars.length];
    n = Math.floor(n / chars.length) || (n + uid.charCodeAt(i % uid.length));
  }
  return token;
}
