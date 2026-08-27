import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import path from "node:path";

// Le build Vercel ne lance que `prisma generate` (voir package.json "build"),
// jamais `prisma migrate deploy` : appliquer les migrations sur la base de
// production (Neon) reste une etape manuelle, distincte de `npm run dev`
// qui pointe sur la base locale via .env. Ce script centralise cette etape
// plutot que de refaire a la main le export DATABASE_URL + npx prisma migrate
// deploy a chaque fois.
const ENV_FILE = ".env.production.bak";

function maskedHost(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "(URL illisible)";
  }
}

async function main() {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  const result = config({ path: envPath });

  if (result.error) {
    console.error(`Impossible de charger ${ENV_FILE} : ${result.error.message}`);
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(`DATABASE_URL absent de ${ENV_FILE}.`);
    process.exit(1);
  }

  console.log(`Cible : ${maskedHost(databaseUrl)} (${ENV_FILE})`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Appliquer les migrations Prisma en attente sur cette base de PRODUCTION ? (o/N) ");
  rl.close();
  if (answer.trim().toLowerCase() !== "o") {
    console.log("Annulé.");
    process.exit(0);
  }

  const child = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  process.exit(child.status ?? 1);
}

main();
