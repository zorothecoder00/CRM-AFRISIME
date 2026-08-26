export type ClosureCheckItem = {
  key: string;
  label: string;
  done: boolean;
  // false pour un item auto dont la collection sous-jacente est vide (ex.
  // "Aucun contrat") — distingue "rien à vérifier" de "vérifié complet",
  // deux états que `done: true` seul confondait auparavant (§52 audit).
  applicable: boolean;
  auto: boolean;
  detail: string | null;
};

/**
 * Checklist de clôture (cahier des charges Project Studio §52) — 4 des 9
 * items sont calculables depuis des données déjà présentes (livrables,
 * contrats, paiements, risques) ; les 5 autres (documents/actifs/rapports/
 * bénéficiaires/partenaires) sont des actes administratifs hors modèle,
 * cochés manuellement — voir ProjectClosureChecklist.
 */
export function computeClosureChecklist(input: {
  deliverables: { statut: string }[];
  contracts: { statut: string }[];
  payments: { statut: string }[];
  risks: { statut: string }[];
  manual: {
    documentsArchives: boolean;
    actifsTransferes: boolean;
    rapportsRemis: boolean;
    beneficiairesInformes: boolean;
    partenairesInformes: boolean;
  };
}): ClosureCheckItem[] {
  const { deliverables, contracts, payments, risks, manual } = input;

  const livrablesValides = deliverables.filter((d) => d.statut === "VALIDE").length;
  const contratsClotures = contracts.filter((c) => c.statut !== "ACTIF").length;
  const paiementsEffectues = payments.filter((p) => p.statut === "PAYE").length;
  const risquesClotures = risks.filter((r) => r.statut === "CLOS").length;

  return [
    {
      key: "livrables",
      label: "Livrables terminés",
      done: deliverables.length > 0 && livrablesValides === deliverables.length,
      applicable: deliverables.length > 0,
      auto: true,
      detail: deliverables.length > 0 ? `${livrablesValides}/${deliverables.length} validés` : "Aucun livrable",
    },
    {
      key: "contrats",
      label: "Contrats clôturés",
      done: contracts.length > 0 && contratsClotures === contracts.length,
      applicable: contracts.length > 0,
      auto: true,
      detail: contracts.length > 0 ? `${contratsClotures}/${contracts.length} clôturés` : "Aucun contrat",
    },
    {
      key: "paiements",
      label: "Paiements effectués",
      done: payments.length > 0 && paiementsEffectues === payments.length,
      applicable: payments.length > 0,
      auto: true,
      detail: payments.length > 0 ? `${paiementsEffectues}/${payments.length} payés` : "Aucun paiement",
    },
    {
      key: "risques",
      label: "Risques clôturés",
      done: risks.length > 0 && risquesClotures === risks.length,
      applicable: risks.length > 0,
      auto: true,
      detail: risks.length > 0 ? `${risquesClotures}/${risks.length} clôturés` : "Aucun risque",
    },
    { key: "documentsArchives", label: "Documents archivés", done: manual.documentsArchives, applicable: true, auto: false, detail: null },
    { key: "actifsTransferes", label: "Actifs transférés", done: manual.actifsTransferes, applicable: true, auto: false, detail: null },
    { key: "rapportsRemis", label: "Rapports remis", done: manual.rapportsRemis, applicable: true, auto: false, detail: null },
    { key: "beneficiairesInformes", label: "Bénéficiaires informés", done: manual.beneficiairesInformes, applicable: true, auto: false, detail: null },
    { key: "partenairesInformes", label: "Partenaires informés", done: manual.partenairesInformes, applicable: true, auto: false, detail: null },
  ];
}
