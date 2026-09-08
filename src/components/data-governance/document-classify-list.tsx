import { ExpandableList } from "@/components/ui/expandable-list";
import { DocumentClassifyRow, type DocumentClassifyRowData } from "@/components/data-governance/document-classify-row";

const MAX_VISIBLE = 5;

/** Demande utilisateur — la carte listait jusqu'a 50 documents d'un coup ;
 * limitee a 5, le reste se deplie sur place (pas de page dediee a cette
 * vue de classification). */
export function DocumentClassifyList({
  rows,
  users,
}: {
  rows: DocumentClassifyRowData[];
  users: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <ExpandableList
        items={rows.map((data) => (
          <DocumentClassifyRow key={data.documentId} data={data} users={users} />
        ))}
        max={MAX_VISIBLE}
      />
    </div>
  );
}
