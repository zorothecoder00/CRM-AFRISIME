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
  // hors-ligne reste hors-scope : évalué le 2026-08-20 avec Serwist (seule
  // option service-worker citée par la doc Next.js "Progressive Web Apps"),
  // mais ce projet tourne sous Turbopack par défaut (Next 16) et le seul
  // package Serwist compatible Turbopack (@serwist/turbopack) n'existe qu'en
  // version preview pre-1.0 (10.0.0-preview.x, tag npm "preview") — pas de
  // dépendance pre-release sur le pipeline de build. À réévaluer quand une
  // version stable Turbopack de Serwist sortira.
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
//   Scalabilité      : 🟡 Next.js (serverless-compatible, sans état partagé
//     en mémoire entre requêtes) + Neon Postgres (pooler de connexions,
//     autoscaling du compute côté fournisseur) absorbent une croissance de
//     trafic sans changement de code ; pas encore éprouvé en charge réelle
//     (pas de tests de charge effectués). health-score.ts et
//     maturity-assessment.ts (les deux calculs les plus lourds, agrégats
//     sur ~10-20 tables) sont mis en cache via unstable_cache (5-10 min,
//     voir commentaires dans ces fichiers) plutôt que recalculés à chaque
//     affichage — pas de pré-agrégation en table dédiée (MetricSnapshot
//     reste réservé aux séries temporelles, §11) : à revisiter si le
//     volume de données grossit fortement au point que même un cache de
//     quelques minutes ne suffise plus.
//   API-first        : ✅ toute mutation passe par une server action typée
//     (jamais de logique métier directement dans un composant serveur).
//   Sécurité         : ✅ permissions granulaires + MFA + audit (§18/§22/§44).
//   Multi-tenant     : 🟡 Phase 1 TERMINÉE (2026-08-20, 17 lots) : organizationId
//     (ou platformOrganizationId sur le cluster CRM, nom deja pris par le
//     sens CRM existant) nullable + RLS (ENABLE sans FORCE) sur 129/138
//     modeles — les seuls 9 exclus (Role/Permission/RolePermission,
//     OrganizationProfile, ExchangeRate, HealthScoreWeight, AppCatalogEntry,
//     RetentionPolicy) portent une contrainte unique globale sur leur cle
//     catalogue (key/id/dataType/dimension/nom @unique) : les rendre
//     reellement multi-tenant est la Phase 4 (contraintes composites), pas
//     une simple colonne additive — decision actee avec l'utilisateur le
//     2026-08-20, voir le commentaire sur PlatformOrganization dans
//     schema.prisma. 178 tests d'integration reels (role Postgres non-
//     proprietaire, voir src/lib/tenant-scoped-prisma.ts), tous verts.
//     withTenantScope N'EST TOUJOURS PAS applique par le reste de l'app
//     (qui continue d'utiliser le client Prisma non scope, exempte de RLS
//     en tant que proprietaire) — toujours pas d'isolation de donnees
//     effective en pratique : le mecanisme est prouve et le schema est pret,
//     mais Phase 2 (brancher les call sites applicatifs sur withTenantScope)
//     reste entierement a faire.
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
