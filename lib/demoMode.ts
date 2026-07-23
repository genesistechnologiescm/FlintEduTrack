import "server-only";

// The demo/competition instance sets EDUTRACK_DEMO_MODE=true. It relaxes
// launch-only frictions that would get in a judge's way — right now, the forced
// PIN change on first login. Production leaves it unset, so security is the
// DEFAULT and demo comfort is the explicit opt-out (never the other way round).
export function isDemoMode(): boolean {
  return process.env.EDUTRACK_DEMO_MODE === "true";
}
