/**
 * Le portail externe (cahier des charges §XXI) n'est pas réservé aux
 * clients — n'importe quel CrmContact avec un email peut recevoir un accès
 * (voir createPortalAccount). Seul le libellé affiché change selon son
 * type, "même logique" pour un partenaire, "missions et livrables" pour un
 * prestataire n'étant pas encore modélisable (CRM non relié à Projet/Tâche).
 */
export function portalLabelForContactType(type: string): string {
  switch (type) {
    case "CLIENT":
      return "Portail client";
    case "PARTENAIRE":
      return "Portail partenaire";
    case "PRESTATAIRE":
      return "Portail prestataire";
    case "FOURNISSEUR":
      return "Portail fournisseur";
    case "CONSULTANT":
      return "Portail consultant";
    default:
      return "Portail";
  }
}
