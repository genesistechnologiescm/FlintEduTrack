// Phone + PIN auth, no SMS dependency: each phone maps to a synthetic internal
// email so we can use Supabase's email/password auth. Users only ever see
// "phone + PIN". Real phone OTP layers on at pilot (Africa's Talking).

// Cameroon numbers are 9 digits (mobile 6…, fixed-line 2…) behind the +237
// country code. The login form shows a "+237" prefix so people type just the
// 9 digits, while seeds/provisioning use the full number — normalize both to
// full international digits ("237XXXXXXXXX") so they map to one account.
// Anything else passes through unchanged rather than guessing.
export function normalizeCmPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^237\d{9}$/.test(digits)) return digits;
  if (/^[62]\d{8}$/.test(digits)) return `237${digits}`;
  return digits;
}

// Canonical storage form for User.phone ("+237XXXXXXXXX", as the seeds store
// it) so lookups by phone match no matter how the number was typed. Falls back
// to the trimmed input for shapes normalizeCmPhone doesn't recognize.
export function canonicalCmPhone(phone: string): string {
  const digits = normalizeCmPhone(phone);
  return /^237\d{9}$/.test(digits) ? `+${digits}` : phone.trim();
}

export function phoneToAuthEmail(phone: string): string {
  return `p${normalizeCmPhone(phone)}@edutrack.local`;
}

// Students log in with a school-issued code, not a phone. Distinct `s` namespace
// so a numeric code can never collide with a parent/staff phone email.
export function studentCodeToAuthEmail(code: string): string {
  return `s${code.toLowerCase().replace(/[^a-z0-9]/g, "")}@edutrack.local`;
}
