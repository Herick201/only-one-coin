// Imports the 2026 Agosto/Setiembre WhatsApp-sale spreadsheets (student +
// enrollment + payment, plus the catalog they need — courses/plans/prices/
// class groups don't exist yet) into the real schema. Bypasses the domain
// layer (packages/domain's Enrollment/Payment factories only ever create
// 'reserved'/'pending' rows — this data needs to land already
// confirmed/approved) the same way apps/api/src/scripts/seed-catalog.ts does
// for a one-off bootstrap script, per packages/domain/README.md's own carve-out
// for that case.
//
// Usage:
//   pnpm --filter @ooc/api import:legacy -- --dir=/path/to/xlsx/folder
//   pnpm --filter @ooc/api import:legacy -- --dir=/path/to/xlsx/folder --commit
//
// Default is a DRY RUN: parses everything, writes
// legacy-import-exceptions.csv and legacy-import-receipts.csv, prints a
// summary, touches no database. Pass --commit to actually write. Against a
// production DATABASE_URL, --commit additionally requires
// I_UNDERSTAND_THIS_WRITES_PRODUCTION=1 in the environment — a deliberate
// second gate, since this is a hard-to-reverse, real-money write.
import path from "node:path";
import { container } from "@/container.js";
import { run } from "./legacy-import/run.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const dirArg = args.find((a) => a.startsWith("--dir="));
  const commit = args.includes("--commit");
  const dir = dirArg ? dirArg.slice("--dir=".length) : path.resolve(process.cwd(), "../../tmp");
  return { dir, commit };
}

async function main() {
  const { dir, commit } = parseArgs();

  if (commit && container.production && process.env.I_UNDERSTAND_THIS_WRITES_PRODUCTION !== "1") {
    console.error(
      "Refusing to --commit against a production DATABASE_URL without I_UNDERSTAND_THIS_WRITES_PRODUCTION=1 set. " +
        "This writes real students/enrollments/payments and is not something to run by accident.",
    );
    process.exit(1);
  }

  await run(commit ? container : null, {
    dir,
    commit,
    outDir: path.resolve(process.cwd(), "legacy-import-reports"),
  });

  process.exit(0);
}

main();
