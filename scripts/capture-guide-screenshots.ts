/**
 * Regenere les captures d'ecran du guide d'utilisation (public/guide/*.jpg).
 *
 * Prerequis (LOCAL uniquement) :
 *   1. base locale seedee : npm run db:seed puis npx tsx scripts/seed-guide-demo.ts
 *   2. serveur lance : NEXTAUTH_URL=http://localhost:3100 npx next dev -p 3100
 *   3. npx tsx scripts/capture-guide-screenshots.ts [id-de-capture...]
 *
 * Les reperes numerotes poses sur les captures correspondent aux legendes
 * de GUIDE_SCREENSHOTS (src/components/guide/guide-screenshots.ts) : meme
 * numero, meme ordre. Un repere introuvable fait echouer le script plutot
 * que de produire une capture incoherente avec sa legende.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;
import { prisma } from "../src/lib/prisma";
import { GUIDE_SCREENSHOTS } from "../src/components/guide/guide-screenshots";

const BASE_URL = process.env.GUIDE_BASE_URL ?? "http://localhost:3100";
const OUT_DIR = path.join(process.cwd(), "public", "guide");
const PASSWORD = "Password123!";
const VIEWPORT = { width: 1440, height: 900 };

type Account = "collaborateur" | "chefprojet" | "dg" | "portail" | null;

type Shot = {
  id: string;
  account: Account;
  path: () => Promise<string>;
  /** Attente supplementaire avant la capture (contenu charge cote client). */
  ready?: (page: Page) => Promise<void>;
  /** Un locator par repere, dans l'ordre des legendes (1, 2, 3...). */
  markers?: (page: Page) => Locator[];
};

async function firstId<T extends { id: string }>(promise: Promise<T | null>, label: string) {
  const row = await promise;
  if (!row) throw new Error(`Donnee de demo introuvable : ${label}`);
  return row.id;
}

const SHOTS: Shot[] = [
  {
    id: "connexion",
    account: null,
    path: async () => "/login",
    markers: (p) => [p.locator("#email"), p.locator("#password"), p.getByRole("link", { name: /Mot de passe oublié/ }), p.locator("button[type=submit]")],
  },
  {
    id: "espace-personnel",
    account: "collaborateur",
    path: async () => "/dashboard",
    markers: (p) => [
      p.getByText("Pour vous", { exact: true }).first(),
      p.locator("header").getByRole("link", { name: "Demandes" }),
      p.locator("header button").last(),
      p.getByText(/voici votre briefing/).first(),
    ],
  },
  {
    id: "taches",
    account: "chefprojet",
    path: async () => "/taches?projetId=demo-project-refonte-site",
    markers: (p) => [
      p.locator("main select").first(),
      p.locator("main").getByText("Kanban", { exact: true }).first(),
      p.getByRole("button", { name: /Nouvelle tâche/ }).first(),
      p.locator("main table tbody tr").first().locator("td").nth(4),
    ],
  },
  {
    id: "fiche-tache",
    account: "chefprojet",
    path: async () => `/taches/${await firstId(prisma.task.findFirst({ where: { statut: "EN_REVISION", projectId: "demo-project-refonte-site" }, select: { id: true } }), "tache en revision")}`,
    markers: (p) => [
      p.locator("main").getByText("En révision", { exact: true }).first(),
      p.getByRole("button", { name: /Demander un report/ }),
      p.locator("main").getByText("Validation", { exact: true }).first(),
      p.getByRole("button", { name: /Approuver/ }),
      p.getByRole("button", { name: /Refuser/ }),
    ],
  },
  {
    id: "fiche-projet",
    account: "chefprojet",
    path: async () => "/projets/demo-project-refonte-site",
    markers: (p) => [
      p.locator("main").getByText("En cours", { exact: true }).first(),
      p.getByRole("button", { name: /Supprimer/ }).first(),
      p.getByRole("button", { name: /Project Studio/ }).first(),
      p.getByRole("tablist").first(),
    ],
  },
  {
    id: "project-studio",
    account: "chefprojet",
    path: async () => "/projets/studio/demo-project-refonte-site",
    markers: (p) => [
      p.locator("main").getByText("Conception", { exact: true }).first(),
      p.locator("main").getByRole("button", { name: "Vues", exact: true }).first(),
      p.locator("main").getByText("Kanban", { exact: true }).first(),
    ],
  },
  {
    id: "planning-personnel",
    account: "collaborateur",
    path: async () => "/planning-personnel",
    markers: (p) => [
      p.getByRole("button", { name: /Demander un créneau/ }).first(),
      p.getByRole("button", { name: /Nouvelle activité/ }).first(),
      p.getByText("Semaine", { exact: true }).first(),
      p.getByText("À planifier", { exact: true }).last(),
      p.getByText("Bilan de ma journée", { exact: true }).first(),
    ],
  },
  {
    id: "demande",
    account: "dg",
    path: async () => `/demandes/${await firstId(prisma.adminRequest.findFirst({ where: { validationRun: { isNot: null } }, orderBy: { createdAt: "desc" }, select: { id: true } }), "demande avec circuit")}`,
    markers: (p) => [p.locator("main").getByText("En attente", { exact: true }).first(), p.locator("main").getByText("Circuit de validation", { exact: true })],
  },
  {
    id: "pipeline",
    account: "dg",
    path: async () => "/crm/pipeline",
    markers: (p) => [
      p.locator("main").getByText("Proposition", { exact: true }).first(),
      p.locator("main").getByText("Programme d'inclusion numérique", { exact: true }).first(),
      p.getByRole("button", { name: /Nouvelle opportunité/ }).first(),
    ],
  },
  {
    id: "tableaux-de-bord",
    account: "dg",
    path: async () => "/tableaux-de-bord",
    markers: (p) => [p.locator("header input[type=search]"), p.getByRole("button", { name: /Configurer/ }), p.locator("main").getByText("Tâches en retard", { exact: true }).first()],
  },
  {
    id: "portail",
    account: "portail",
    path: async () => "/portail",
    markers: (p) => [
      p.getByRole("link", { name: "Accueil", exact: true }).first(),
      p.getByText("Mes projets", { exact: true }).last(),
      p.getByRole("button", { name: /Déconnexion/ }).first(),
    ],
  },
];

async function login(context: BrowserContext, account: Exclude<Account, null>) {
  const page = await context.newPage();
  if (account === "portail") {
    await page.goto(`${BASE_URL}/portail/connexion`);
    await page.fill("#email", "afi.amegah@demo.local");
    await page.fill("#password", PASSWORD);
    await page.click("button[type=submit]");
    await page.waitForURL(/\/portail(\/|$)(?!connexion)/, { timeout: 120_000 });
  } else {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", `${account}@afriflow.local`);
    await page.fill("#password", PASSWORD);
    await page.click("button[type=submit]");
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
  }
  await page.close();
}

async function annotate(page: Page, markers: Locator[], shotId: string) {
  const boxes = [];
  for (const [i, marker] of markers.entries()) {
    const box = await marker.boundingBox();
    if (!box) throw new Error(`[${shotId}] repere ${i + 1} introuvable ou invisible`);
    boxes.push(box);
  }
  await page.evaluate((list) => {
    for (const [i, b] of list.entries()) {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "fixed", left: `${b.x - 4}px`, top: `${b.y - 4}px`, width: `${b.width + 8}px`, height: `${b.height + 8}px`,
        border: "2.5px solid #e08a12", borderRadius: "8px", zIndex: "2147483646", pointerEvents: "none",
      });
      const badge = document.createElement("div");
      badge.textContent = String(i + 1);
      Object.assign(badge.style, {
        // Pastille au-dessus du cadre (ou dessous si pas la place) pour ne
        // jamais masquer le texte de l'element signale.
        position: "fixed", left: `${Math.max(2, b.x - 6)}px`, top: `${b.y >= 36 ? b.y - 34 : b.y + b.height + 8}px`, width: "26px", height: "26px",
        borderRadius: "50%", background: "#e08a12", color: "#fff", font: "700 14px/26px system-ui, sans-serif", textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,.35)", zIndex: "2147483647", pointerEvents: "none",
      });
      document.body.append(ring, badge);
    }
  }, boxes);
}

// Une seule connexion par compte : la connexion est limitee a 8 tentatives
// par e-mail et par 10 minutes (src/lib/auth.ts), se reconnecter a chaque
// capture declenchait RATE_LIMITED.
const sessions = new Map<Exclude<Account, null>, StorageState>();

async function capture(browser: Browser, shot: Shot) {
  const contextOptions = { viewport: VIEWPORT, colorScheme: "light" as const, locale: "fr-FR" };
  if (shot.account && !sessions.has(shot.account)) {
    const loginContext = await browser.newContext(contextOptions);
    await login(loginContext, shot.account);
    sessions.set(shot.account, await loginContext.storageState());
    await loginContext.close();
  }
  const context = await browser.newContext({ ...contextOptions, storageState: shot.account ? sessions.get(shot.account) : undefined });
  try {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${await shot.path()}`, { waitUntil: "networkidle", timeout: 180_000 });
    // Masque l'indicateur de dev Next.js et les toasts eventuels.
    await page.addStyleTag({ content: "nextjs-portal, [data-sonner-toaster] { display: none !important; }" });
    await shot.ready?.(page);
    await page.waitForTimeout(800);
    if (process.env.GUIDE_NO_MARKERS) {
      await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}.jpg`), type: "jpeg", quality: 82 });
      console.log(`✓ ${shot.id} (sans reperes)`);
      return;
    }
    const legend = GUIDE_SCREENSHOTS[shot.id]?.markers ?? [];
    const markers = shot.markers?.(page) ?? [];
    if (markers.length !== legend.length) {
      throw new Error(`[${shot.id}] ${markers.length} repere(s) poses pour ${legend.length} legende(s)`);
    }
    if (markers.length) await annotate(page, markers, shot.id);
    await page.screenshot({ path: path.join(OUT_DIR, `${shot.id}.jpg`), type: "jpeg", quality: 82 });
    console.log(`✓ ${shot.id}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const only = process.argv.slice(2);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const shot of SHOTS.filter((s) => only.length === 0 || only.includes(s.id))) {
      await capture(browser, shot);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
