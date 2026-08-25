import Image from "next/image";

/**
 * Habillage partagé des pages d'authentification (login, mot de passe
 * oublié, réinitialisation) — panneau de marque en dégradé sur desktop,
 * formulaire centré sur mobile. Couleurs reprises de la palette déjà
 * utilisée ailleurs dans l'app (StatCard/KpiCard) pour rester cohérent.
 *
 * Le show/hide responsive passe par .show-desktop-lg/.show-mobile-lg
 * (definies dans globals.css) plutôt que par hidden/flex + lg: de Tailwind :
 * le CSS global du projet contient une seconde definition non-layered de
 * .hidden/.flex (empilement tailwindcss + shadcn/tailwind.css) qui bat
 * systematiquement les variantes responsives de Tailwind.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="show-desktop-lg relative w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2a78d6] via-[#3a5fc4] to-[#4a3aa7] p-12 text-white">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 -bottom-16 h-80 w-80 translate-x-1/4 rounded-full bg-[#fab219]/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <Image src="/logo.png" alt="AfriSime Work-Space" width={72} height={48} className="h-12 w-auto" priority />
          AfriSime Work-Space
        </div>

        <div className="relative space-y-4">
          <h1 className="text-4xl leading-tight font-semibold text-balance">
            Planifier. Collaborer.
            <br />
            Exécuter. Contrôler.
          </h1>
          <p className="max-w-md text-white/75">
            La plateforme collaborative qui centralise vos projets, vos équipes et votre
            performance.
          </p>
        </div>

        <p className="relative text-sm text-white/50">
          AfriSime Work-Space — {new Date().getFullYear()}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="show-mobile-lg items-center gap-2.5 text-lg font-semibold">
            <Image src="/logo.png" alt="AfriSime Work-Space" width={72} height={48} className="h-12 w-auto" />
            AfriSime Work-Space
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
