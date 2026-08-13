"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { toneForStatus } from "@/lib/status-tone";

export type MappedProjectRow = {
  id: string;
  nom: string;
  statut: string;
  avancement: number;
  localisation: string | null;
  latitude: number;
  longitude: number;
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIE: "Planifié",
  EN_COURS: "En cours",
  EN_PAUSE: "En pause",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

// Meme palette que ProjectRoadmapView — coherence visuelle des couleurs de
// statut projet a travers les vues, sans dependre d'un fichier partage.
const STATUS_COLOR: Record<string, string> = {
  TERMINE: "#0ca30c",
  EN_COURS: "#2a78d6",
  EN_PAUSE: "#fab219",
  PLANIFIE: "#8994a0",
  ANNULE: "#8994a0",
};

function pinIcon(statut: string) {
  const color = STATUS_COLOR[statut] ?? STATUS_COLOR.PLANIFIE;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

/** Recentre/zoome automatiquement sur les projets localises, une fois au montage. */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 6);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length]);
  return null;
}

/** Vue Carte (cahier des charges §VI) — projets localises, tuiles OpenStreetMap (aucune cle API requise). */
export function ProjectMap({ projects }: { projects: MappedProjectRow[] }) {
  const positions: [number, number][] = projects.map((p) => [p.latitude, p.longitude]);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-md border">
      <MapContainer center={[2, 20]} zoom={3} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {projects.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pinIcon(p.statut)}>
            <Popup>
              <div className="space-y-1">
                <Link href={`/projets/${p.id}`} className="font-medium hover:underline">
                  {p.nom}
                </Link>
                {p.localisation && <div className="text-xs text-muted-foreground">{p.localisation}</div>}
                <div className="flex items-center gap-1.5 text-xs">
                  <Badge variant={toneForStatus(p.statut)}>{STATUS_LABELS[p.statut]}</Badge>
                  <span>{p.avancement}%</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
