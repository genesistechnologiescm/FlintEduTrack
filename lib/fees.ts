// Pure, client-safe fee helpers. (Balance computation lives in lib/feeBalance.ts,
// which is server-only because it touches Prisma.)

export function formatFcfa(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} FCFA`;
}
