import { ExpandableList } from "@/components/ui/expandable-list";

const MAX_VISIBLE = 5;

export type TeamActivityRow = { id: string; userName: string; label: string; createdAt: string };

function Row({ entry }: { entry: TeamActivityRow }) {
  return (
    <li className="flex items-baseline justify-between text-sm">
      <span>
        <span className="font-medium">{entry.userName}</span> {entry.label}
      </span>
      <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString("fr-FR")}</span>
    </li>
  );
}

/** Pas de page dediee "activite de l'equipe" vers laquelle renvoyer (le
 * journal d'audit complet est reserve a /audit, admin) : le reste — deja
 * recupere cote serveur (max 8) — se deplie sur place. */
export function TeamActivityList({ entries }: { entries: TeamActivityRow[] }) {
  return (
    <ul className="space-y-2">
      <ExpandableList items={entries.map((entry) => <Row key={entry.id} entry={entry} />)} max={MAX_VISIBLE} />
    </ul>
  );
}
