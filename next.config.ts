import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // pdfkit lit ses fichiers de police (.afm) via __dirname au moment de
  // l'exécution ; empaqueté par Turbopack, ce chemin relatif casse (ENOENT).
  // Externalisé, il est chargé par require() Node normal depuis node_modules.
  serverExternalPackages: ["pdfkit"],
  // Offline Mode (cahier des charges V3.0 §43) — détection de connectivité +
  // retry automatique des navigations/Server Actions en attente (voir
  // src/components/pwa/offline-banner.tsx). Un rechargement complet de page
  // hors-ligne reste hors-scope (nécessiterait un service worker dédié).
  experimental: {
    useOffline: true,
  },
};

// Architecture technique cible (cahier des charges V3.0 §53) — "le
// développeur devra progressivement tendre vers" cette pile en couches.
// État réel de chaque couche dans cette instance, pour que la progression
// future parte d'un état exact :
//
//   Frontend (Web + Mobile) : ✅ Web (Next.js App Router). 🟡 "Mobile" =
//     PWA installable (§43, app/manifest.ts) + responsive, pas d'app
//     native séparée — proportionné tant qu'aucune fonctionnalité
//     n'exige un accès natif (caméra avancée, notifications push natives).
//   API Gateway      : 🟡 pas de gateway dédiée (Kong/Apigee...) — /api/v1/*
//     + authenticateApiKey() (src/lib/api-keys.ts) en jouent le rôle
//     fonctionnel (auth, permission scoping) sans le composant d'infra
//     séparé. Suffisant au volume actuel ; à réévaluer si le nombre
//     d'intégrations externes croît fortement.
//   Core Platform     : ✅ Next.js (routes + server actions) + Prisma + Postgres.
//   Services métiers  : ✅ src/lib/*.ts — délibérément séparé des routes/
//     actions (voir toute cette extension V3.0 : chaque module a son
//     fichier lib dédié, jamais de logique métier dans un composant).
//   Workflow Engine   : ✅ ValidationWorkflow (§9) + OrchestrationPlaybook (§8 v2.2).
//   Automation Engine : ✅ AutomationRule/automation.ts (§8 v2.0, §42-43 v2.2).
//   AI Layer          : ✅ ai-agents.ts (recordInsight, agents §16) +
//     PendingAiAction (validation humaine) — toutes deux consolidées dans
//     le registre §47 (/gouvernance-ia). Heuristiques déterministes, pas
//     de modèle entraîné/LLM (aucune clé API disponible dans cette instance).
//   Analytics/Data    : 🟡 MetricSnapshot + /api/v1/metrics (§48) posent la
//     fondation ; pas de vrai Data Warehouse/Lake séparé — voir la note
//     détaillée sur src/app/api/v1/metrics/route.ts.
//   Integration Layer : ✅ Integration/IntegrationEvent (§21) + /api/v1/*
//     + webhooks entrants.
//   External Systems  : ✅ AfriGes (IntegrationType.AFRIGES) et autres
//     systèmes financiers/tiers (SYSTEME_FINANCIER, OUTIL_BI...) — voir
//     §55 ci-dessous pour la frontière de responsabilité avec AfriGes.
//
// Principes d'architecture (cahier des charges V3.0 §54) — état réel,
// même esprit que §45 (zero-trust, voir src/lib/permissions.ts) :
//   Modularité       : ✅ un fichier lib par domaine, actions séparées des pages.
//   API-first        : ✅ toute mutation passe par une server action typée
//     (jamais de logique métier directement dans un composant serveur).
//   Sécurité         : ✅ permissions granulaires + MFA + audit (§18/§22/§44).
//   Multi-tenant     : 🟡 registre seulement (§27, PlatformOrganization) —
//     pas d'isolation de données effective, voir le commentaire détaillé
//     sur ce modèle dans schema.prisma.
//   Multi-entités    : ✅ Entity + Department.entityId (V2.2 §22-23), déjà
//     opérationnel (consolidation, benchmarking §32).
//   Extensibilité    : ✅ modèles génériques ouverts (Dependency, EntityTag,
//     DataClassification §46) plutôt que des tables dédiées par paire de
//     types — nouveau type ajouté sans migration.
//   Observabilité    : ❌ aucun outil de monitoring/tracing infra (APM,
//     Sentry...) configuré — seul AuditLog (niveau applicatif, "qui a fait
//     quoi") existe. Un vrai chantier d'observabilité (erreurs, latence,
//     disponibilité) reste à faire séparément.
//   Haute disponibilité /
//   Sauvegarde /
//   Reprise après
//   incident         : 🟡 hérité de l'infra d'hébergement (Vercel + Neon
//     Postgres, tous deux avec leur propre SLA/réplication géographique),
//     pas de configuration applicative dédiée. Export de sauvegarde manuel
//     existant (/administration/donnees, DATA_BACKUP_MANAGE) ; pas de plan
//     de reprise après incident documenté/testé.
export default withNextIntl(nextConfig);
