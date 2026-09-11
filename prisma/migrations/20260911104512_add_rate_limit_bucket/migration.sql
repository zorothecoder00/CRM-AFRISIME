-- Revue de robustesse (2026-09-11) — aucun rate limiting n'existait dans
-- l'app. Compteur a fenetre fixe par cle logique (email, ip...), voir
-- src/lib/rate-limit.ts.

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);
