import "dotenv/config";
import fs from "node:fs";
import { chromium, type Page } from "playwright";
import { prisma } from "../src/lib/prisma";
import { GUIDE_MODULES } from "../src/components/guide/guide-data";

const BASE = "http://localhost:3100";

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "Password123!");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/dashboard/, { timeout: 180_000 });
}

async function scan(page: Page, route: string) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 240_000 });
    await page.waitForTimeout(600);
  } catch (e) {
    return [{ route, text: `ERREUR navigation: ${(e as Error).message.slice(0, 80)}`, cls: "" }];
  }
  if (!page.url().includes(route.split("?")[0].split("#")[0])) return [{ route, text: `redirige vers ${page.url()}`, cls: "" }];
  let found: { text: string; cls: string; tag: string }[] = [];
  try {
  found = await page.evaluate(() => {
    const out: { text: string; cls: string; tag: string }[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
      const cs = getComputedStyle(el);
      const text = (el.innerText || "").trim().replace(/\s+/g, " ");
      if (!text || text.length > 45) continue;
      const ellipsis = cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1;
      const clamp = cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== "" && el.scrollHeight > el.clientHeight + 2;
      if (ellipsis || clamp) out.push({ text, cls: (el.className?.toString() || "").slice(0, 140), tag: el.tagName });
    }
    return out;
  });
  } catch (e) {
    return [{ route, text: `ERREUR analyse: ${(e as Error).message.slice(0, 60)}`, cls: "" }];
  }
  return found.map((f) => ({ route, ...f }));
}

async function main() {
  await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: "login:" } } });
  const [project, task, request, contact, meeting, opp] = await Promise.all([
    prisma.project.findFirst({ where: { id: "demo-project-refonte-site" }, select: { id: true } }),
    prisma.task.findFirst({ where: { projectId: "demo-project-refonte-site" }, select: { id: true } }),
    prisma.adminRequest.findFirst({ select: { id: true } }),
    prisma.crmContact.findFirst({ where: { id: "guide-contact-afi" }, select: { id: true } }),
    prisma.meeting.findFirst({ select: { id: true } }),
    prisma.crmOpportunity.findFirst({ where: { id: "guide-opp-3" }, select: { id: true } }),
  ]);
  const routes = Array.from(
    new Set([
      ...GUIDE_MODULES.map((m) => m.href).filter((h) => !h.startsWith("/portail")),
      "/guide",
      "/projets/calendrier",
      "/projets/carte",
      `/projets/${project?.id}`,
      `/projets/studio/${project?.id}`,
      `/taches/${task?.id}`,
      `/demandes/${request?.id}`,
      `/crm/contacts/${contact?.id}`,
      `/reunions/${meeting?.id}`,
      `/crm/opportunites/${opp?.id}`,
      "/planning-personnel/ma-journee",
      "/planning-personnel/agenda",
      "/planning-personnel/calendrier",
      "/planning-personnel/a-planifier",
      "/planning-personnel/mes-taches",
      "/planning-personnel/performance",
      "/planning-personnel/charge-de-travail",
      "/planning-personnel/equipe",
      "/planning-personnel/workforce-control",
    ])
  );
  const start = process.env.START ? routes.indexOf(process.env.START) : 0;
  routes.splice(0, Math.max(0, start));
  const browser = await chromium.launch();
  const results: unknown[] = [];
  for (const [email, list] of [
    ["dg@afriflow.local", routes],
    ["collaborateur@afriflow.local", ["/dashboard", "/planning-personnel", "/taches"]],
  ] as const) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await login(page, email);
    for (const r of list) {
      const res = await scan(page, r);
      results.push(...res.map((x) => ({ account: email.split("@")[0], ...x })));
      process.stdout.write(`${r} ${res.length}\n`);
      fs.writeFileSync(process.env.OUT!, JSON.stringify(results, null, 1));
    }
    await ctx.close();
  }
  // Portail
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/portail/connexion`);
  await page.fill("#email", "afi.amegah@demo.local");
  await page.fill("#password", "Password123!");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/portail(?!\/connexion)/, { timeout: 180_000 });
  for (const r of ["/portail", "/portail/projets", "/portail/messages", "/portail/actualites", "/portail/reunions"]) {
    const res = await scan(page, r);
    results.push(...res.map((x) => ({ account: "portail", ...x })));
  }
  await browser.close();
  fs.writeFileSync(process.env.OUT!, JSON.stringify(results, null, 1));
  console.log("total", results.length);
}
main().finally(() => prisma.$disconnect());
