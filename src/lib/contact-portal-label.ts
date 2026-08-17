/**
 * Le portail externe (cahier des charges §16-20) n'est pas réservé aux
 * clients — n'importe quel CrmContact avec un email peut recevoir un accès
 * (voir createPortalAccount). Seul le libellé affiché change selon son
 * type — et, pour un bailleur, selon le type de son organisation
 * (INSTITUTION), un contact INVESTISSEUR pouvant très bien appartenir à une
 * institution finançant un programme plutôt qu'à un simple fonds privé.
 */
export function portalLabelForContactType(type: string, organizationType?: string | null): string {
  if (organizationType === "INSTITUTION") return "Portail bailleur";
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
    case "INVESTISSEUR":
      return "Portail investisseur";
    default:
      return "Portail";
  }
}
