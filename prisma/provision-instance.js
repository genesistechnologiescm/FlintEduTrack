// Provisions a FRESH EduTrack database instance: pushes the Prisma schema,
// then applies every RLS policy file (rls.sql first — it defines the helper
// functions the others depend on — then the rest in name order, so later
// "-v2" files win where they overlap). Picks up new rls-*.sql files
// automatically. Safe to re-run: db push is additive and the policy files
// drop-and-recreate their own policies.
//
// Run against the target instance's env file:
//   npm run db:provision          (reads .env.production.local)
//
// Guard: refuses to run against the DEMO project unless explicitly overridden
// with ALLOW_DEMO_PROVISION=1 — the whole point of the pilot instance is
// separation from demo data.
const { execSync } = require("child_process");
const { readdirSync } = require("fs");
const path = require("path");

const DEMO_PROJECT_REF = "nzhnriwzoygnthhlqzbr";

function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("No DIRECT_URL / DATABASE_URL in the environment. Fill .env.production.local first (see .env.production.example).");
    process.exit(1);
  }
  const host = (url.match(/@([^/:]+)/) || [])[1] ?? "unknown-host";
  if (url.includes(DEMO_PROJECT_REF) && process.env.ALLOW_DEMO_PROVISION !== "1") {
    console.error("Refusing: this env points at the DEMO project. Set ALLOW_DEMO_PROVISION=1 only if that is really what you want.");
    process.exit(1);
  }
  console.log(`Provisioning instance at: ${host}`);

  const run = (cmd) => {
    console.log(`\n$ ${cmd}`);
    execSync(cmd, { stdio: "inherit", cwd: path.join(__dirname, "..") });
  };

  // 1) Schema
  run("npx prisma db push --schema prisma/schema.prisma");

  // 2) RLS — base file first (helper functions), then the rest sorted.
  const dir = __dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const ordered = ["rls.sql", ...files.filter((f) => f !== "rls.sql").sort()];
  for (const f of ordered) {
    if (!files.includes(f)) continue;
    run(`npx prisma db execute --file prisma/${f} --schema prisma/schema.prisma`);
  }

  console.log(`\n✔ Provisioned ${host}: schema + ${ordered.length} policy files.`);
  console.log("Next: npm run db:bootstrap (first school + first admin), then set the same keys in Vercel.");
}

main();
