// Phone + PIN auth, no SMS dependency: each phone maps to a synthetic internal
// email so we can use Supabase's email/password auth. Users only ever see
// "phone + PIN". Real phone OTP layers on at pilot (Africa's Talking).
export function phoneToAuthEmail(phone: string): string {
  return `p${phone.replace(/\D/g, "")}@edutrack.local`;
}

// Students log in with a school-issued code, not a phone. Distinct `s` namespace
// so a numeric code can never collide with a parent/staff phone email.
export function studentCodeToAuthEmail(code: string): string {
  return `s${code.toLowerCase().replace(/[^a-z0-9]/g, "")}@edutrack.local`;
}
