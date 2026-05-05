// Generates an access code in the format XXX-XXX-XXX-XXX using an alphabet
// that strips visually ambiguous characters (no 0/O, 1/I/L). 12 random chars
// out of a 32-char alphabet => ~60 bits of entropy, plenty for a credential
// behind Supabase Auth's per-IP rate limit.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateAccessCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return [
    chars.slice(0, 3).join(''),
    chars.slice(3, 6).join(''),
    chars.slice(6, 9).join(''),
    chars.slice(9, 12).join(''),
  ].join('-');
}
