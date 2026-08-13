/**
 * Un document depose depuis le portail externe (cahier des charges §21) a
 * uploadedBy null et uploadedByContact renseigne ; l'inverse pour un depot
 * interne classique.
 */
export function documentUploaderName(doc: {
  uploadedBy: { name: string } | null;
  uploadedByContact: { prenom: string; nom: string } | null;
}) {
  if (doc.uploadedBy) return doc.uploadedBy.name;
  if (doc.uploadedByContact) return `${doc.uploadedByContact.prenom} ${doc.uploadedByContact.nom} (portail)`;
  return "—";
}
