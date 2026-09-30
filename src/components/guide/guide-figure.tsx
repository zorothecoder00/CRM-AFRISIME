import Image from "next/image";
import { GUIDE_SCREENSHOTS, GUIDE_SCREENSHOT_SIZE } from "./guide-screenshots";

/**
 * Capture d'ecran annotee du guide + legende de ses reperes. Cliquer
 * l'image l'ouvre en taille reelle dans un nouvel onglet.
 */
export function GuideFigure({ id }: { id: string }) {
  const shot = GUIDE_SCREENSHOTS[id];
  const src = `/guide/${id}.jpg`;
  return (
    <figure className="space-y-3 rounded-lg border bg-card p-3 sm:p-4">
      <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border" title="Ouvrir en taille réelle">
        <Image
          src={src}
          alt={`Capture d'écran : ${shot.title}`}
          width={GUIDE_SCREENSHOT_SIZE.width}
          height={GUIDE_SCREENSHOT_SIZE.height}
          sizes="(min-width: 1024px) 70vw, 100vw"
          className="h-auto w-full"
        />
      </a>
      <figcaption className="space-y-2">
        <div className="text-sm">
          <span className="font-semibold">{shot.title}.</span> <span className="text-muted-foreground">{shot.caption}</span>
        </div>
        {shot.markers.length > 0 && (
          <ol className="grid gap-x-6 gap-y-1.5 text-sm md:grid-cols-2">
            {shot.markers.map((label, i) => (
              <li key={label} className="flex items-start gap-2">
                <span className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning font-mono text-[0.7rem] font-bold text-white">
                  {i + 1}
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        )}
      </figcaption>
    </figure>
  );
}
