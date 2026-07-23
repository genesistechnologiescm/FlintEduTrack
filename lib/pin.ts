// Shared PIN-strength policy. A 5-digit PIN is the login secret for parents,
// staff and students, so we reject the guesses an attacker tries first: the
// demo PIN, all-same digits, and simple runs. Returns a short reason CODE (so
// callers can localise the message) or null when the PIN is acceptable.
export type PinReason = "length" | "repeated" | "sequential" | "common";

// A small blocklist of the most-tried 5-digit PINs (plus the public demo PIN).
const BLOCKED = new Set([
  "12345", "54321", "00000", "11111", "12321", "13579", "24680", "98765", "10101", "55555",
]);

export function checkPin(pin: string): PinReason | null {
  if (!/^\d{5}$/.test(pin)) return "length";
  if (BLOCKED.has(pin)) return "common";
  // All the same digit — "22222".
  if (/^(\d)\1{4}$/.test(pin)) return "repeated";
  // Strictly ascending or descending consecutive runs — "34567", "65432".
  const digits = pin.split("").map(Number);
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) return "sequential";
  return null;
}
