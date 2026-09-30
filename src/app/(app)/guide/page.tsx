import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { GuideToc } from "@/components/guide/guide-toc";
import { GuideCatalog } from "@/components/guide/guide-catalog";
import { Block, Bullets, Callout, Chain, Chapter, Flow, Grid, Note, Panel, Prose, Tags } from "@/components/guide/guide-blocks";
import { GUIDE_MODULES } from "@/components/guide/guide-data";

/**
 * Guide d'utilisation — documentation fonctionnelle de bout en bout, pour la
 * Direction et les utilisateurs non techniques. Contenu statique : a tenir a
 * jour a la main quand un parcours, un statut ou un droit par defaut change
 * (voir aussi src/components/guide/guide-data.ts pour le catalogue).
 */

const ROLE_COLUMNS = ["DG", "Dir.", "Chef dép.", "Chef proj.", "Resp.", "Manager", "Collab.", "Externe*"];
// 1 = oui, 0 = non, 2 = partiel (voir la note sous le tableau)
const ROLE_MATRIX: [string, number[]][] = [
  ["Voir projets, tâches, réunions, documents", [1, 1, 1, 1, 1, 1, 1, 1]],
  ["Faire avancer ses tâches, commenter", [1, 1, 1, 1, 1, 1, 1, 2]],
  ["Demander un congé, un achat, une mission", [1, 1, 1, 1, 1, 1, 1, 0]],
  ["Consulter le CRM, la stratégie, les évaluations", [1, 1, 1, 1, 1, 1, 1, 0]],
  ["Créer et assigner des tâches, organiser des réunions", [1, 1, 1, 1, 1, 1, 0, 0]],
  ["Approuver les congés, voir la charge de l'équipe, tableaux de bord, rapports", [1, 1, 1, 1, 1, 1, 0, 0]],
  ["Valider les tâches et les demandes administratives", [1, 1, 1, 1, 1, 0, 0, 0]],
  ["Créer / modifier / supprimer des projets, gérer les équipes, corbeille", [1, 1, 1, 1, 0, 0, 0, 0]],
  ["Valider un projet, gérer les plans et départements", [1, 1, 1, 0, 0, 0, 0, 0]],
  ["Gouvernance (instances, décisions), export complet", [1, 1, 0, 0, 0, 0, 0, 0]],
  ["Centre de commande, Administration, sécurité, sauvegardes, circuits de validation", [1, 0, 0, 0, 0, 0, 0, 0]],
];

const GLOSSARY: [string, string][] = [
  ["Circuit de validation", "Suite ordonnée d'approbateurs (par rôle) par laquelle passe une tâche ou une demande."],
  ["Co-responsable", "Personne assignée à une tâche en plus du responsable principal."],
  ["Corbeille", "Là où vont les éléments supprimés. Restaurables ; suppression définitive uniquement à la main."],
  ["Cadre logique", "Tableau classique des projets de développement : objectifs, résultats, indicateurs, sources de vérification, hypothèses."],
  ["Chemin critique", "Suite de tâches dont le moindre retard décale la date de fin du projet."],
  ["EVM", "Valeur acquise : compare ce qui a été dépensé et réalisé à ce qui était prévu."],
  ["Jalon", "Date clé d'un projet (ex. « remise du rapport intermédiaire »)."],
  ["Livrable", "Produit concret attendu (rapport, formation, bâtiment…)."],
  ["KPI", "Indicateur chiffré de performance, rattaché à un objectif, un projet ou une tâche."],
  ["OKR", "Objectif + résultats clés mesurables. La page Contribution OKR montre comment chaque projet sert la stratégie."],
  ["Partie prenante", "Personne ou organisation concernée par un projet. Un profil unique réutilisable sur plusieurs projets."],
  ["Playbook", "Enchaînement d'actions automatiques lancé par un seul déclencheur."],
  ["Portail", "Espace séparé, pour les contacts externes, avec son propre identifiant."],
  ["RACI", "Qui Réalise, qui Approuve, qui est Consulté, qui est Informé, pour chaque activité."],
  ["Double authentification", "En plus du mot de passe, un code à 6 chiffres généré par une application sur le téléphone."],
  ["Journal d'audit", "Registre de toutes les actions : qui a fait quoi et quand. Non modifiable."],
];

const FAQ: [string, ReactNode][] = [
  ["Pourquoi mon collègue voit un menu que je n'ai pas ?", "Les menus dépendent du rôle et des accès avancés. Si un menu vous manque pour votre travail, demandez à l'administrateur d'ajuster votre rôle ou de vous accorder une exception. Le changement s'applique à votre prochaine connexion."],
  ["J'ai fini ma tâche mais elle n'est pas « Terminée ».", "Si elle doit être validée, elle reste « En révision » jusqu'à la décision du dernier approbateur. Le bloc Validation de la fiche montre chaque étape et qui doit encore décider."],
  ["L'avancement de mon projet ne bouge pas.", "Il se calcule sur la part de tâches terminées. Des tâches restées « En cours » ou « En révision » ne comptent pas encore."],
  ["J'ai supprimé quelque chose par erreur.", "Rien n'est perdu : l'élément est dans la Corbeille. Un chef de projet ou plus peut le restaurer."],
  ["Je ne reçois aucune notification sur mon téléphone.", "Elles s'activent appareil par appareil : Menu profil → Notifications, sur chaque téléphone ou ordinateur concerné, puis accepter l'autorisation du navigateur."],
  ["Un partenaire externe peut-il voir nos autres projets ?", "Non. Le portail ne montre que les projets auxquels ce contact est rattaché, et seulement les éléments explicitement marqués comme partagés."],
  ["Les chiffres « IA » sont-ils fiables ?", "Ce sont des calculs à partir de vos propres données, selon des règles fixes et explicables. Leur justesse dépend de la qualité de la saisie : dates, statuts et temps passés à jour."],
];

const LIMITS: [string, string, string][] = [
  ["« IA »", "Aucun modèle d'intelligence artificielle n'est branché. Agents, conseiller stratégique, prédictions, assistant : ce sont des calculs automatiques à partir de règles sur vos données.", "Les résultats sont fiables et explicables, mais ce n'est pas une conversation libre type ChatGPT. Les écrans concernés le signalent."],
  ["E-mails", "Le service d'envoi existe mais n'est pas activé.", "Aucun e-mail ne part. Mot de passe oublié et invitations portail se font par lien transmis à la main."],
  ["SMS / WhatsApp", "Aucun fournisseur connecté.", "Les notifications passent par la cloche et les notifications push uniquement."],
  ["Intégrations", "Cadre prêt (AfriGes, Microsoft 365…), sans échange sortant réel.", "Pas de synchronisation automatique avec d'autres logiciels pour l'instant."],
  ["Marketplace", "Catalogue d'applications prévues.", "Aucune application n'est encore installable."],
  ["Délégations", "Registre des délégations d'autorité.", "Ne redirige pas automatiquement les validations vers le délégataire."],
  ["Devises", "Taux de change saisis à la main dans l'administration.", "Pas de mise à jour automatique des taux."],
  ["Multi-organisation", "Registre des organisations (marque, abonnement).", "Conçu pour une seule organisation réelle aujourd'hui ; l'isolation complète entre organisations est en cours."],
];

const STUDIO: [string, string][] = [
  ["Conception", "Diagnostic, arbre des problèmes, arbre des solutions, théorie du changement, cadre logique, objectifs, cadre de résultats, hiérarchie, périmètre, charte."],
  ["Planification", "Chemin critique (tâches qui conditionnent la date de fin), matrice RACI (qui réalise, approuve, est consulté, informé)."],
  ["Budget & financement", "Budget prévu et réel, sources de financement, appels à projets liés."],
  ["Risques, qualité & changements", "Hypothèses, problèmes ouverts, demandes de modification du projet (périmètre, budget, délais), plan qualité."],
  ["Achats & communication", "Achats et marchés, contrats fournisseurs, plan de communication."],
  ["Exécution & pilotage", "Vues d'ensemble, exécution, EVM (est-on en avance ou en retard sur le budget et le planning), KPI."],
  ["Suivi, évaluation & impact", "Bénéficiaires, retours des bénéficiaires, suivi-évaluation, collecte de données terrain."],
  ["Clôture & capitalisation", "Bilan du projet, clôture formelle, leçons apprises versées dans la mémoire de l'organisation."],
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-5 rounded-xl bg-sidebar p-6 text-sidebar-foreground sm:p-8">
        <div className="font-mono text-xs uppercase tracking-widest text-sidebar-foreground/60">Documentation utilisateur</div>
        <h1 className="text-3xl font-bold text-white text-balance sm:text-4xl">Guide d&apos;utilisation</h1>
        <p className="max-w-3xl text-lg text-sidebar-foreground/80">
          Comment fonctionne AfriSime Work-Space, de la connexion jusqu&apos;à la clôture d&apos;un projet. Ce guide s&apos;adresse à la
          Direction et à tous les utilisateurs, sans connaissance technique requise.
        </p>
        <div className="flex flex-wrap gap-2">
          {["Planifier", "Collaborer", "Exécuter", "Contrôler"].map((w) => (
            <span key={w} className="rounded-full border border-white/20 px-3.5 py-1 text-sm text-white">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-4">
          {[
            [String(GUIDE_MODULES.length), "écrans décrits"],
            ["11", "rôles"],
            ["92", "droits d'accès"],
            ["1", "portail externe"],
          ].map(([n, l]) => (
            <div key={l} className="bg-sidebar px-4 py-3">
              <div className="text-2xl font-bold text-white tabular-nums">{n}</div>
              <div className="text-sm text-sidebar-foreground/60">{l}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:relative">
          <GuideToc />
        </aside>

        <div className="min-w-0 space-y-16 pb-16">
          {/* 01 */}
          <Chapter id="apercu">
            <Prose>
              <p>
                AfriSime Work-Space est l&apos;outil commun de toute l&apos;organisation pour <strong>organiser le travail, le suivre et en rendre compte</strong>.
                Il rassemble dans un seul endroit ce qui était auparavant dispersé entre fichiers Excel, e-mails, WhatsApp et réunions : les projets, les
                tâches, les agendas, les réunions, les documents, les demandes internes, les contacts externes et les indicateurs de performance.
              </p>
              <p>
                Chaque personne se connecte avec son propre compte. Selon son <strong>rôle</strong> (collaborateur, manager, chef de projet, directeur…),
                elle voit plus ou moins de menus et peut faire plus ou moins d&apos;actions. Les partenaires externes (clients, bailleurs, fournisseurs)
                disposent d&apos;un <strong>portail séparé</strong> où ils ne voient que ce qui les concerne.
              </p>
            </Prose>
            <Grid cols={3}>
              <Panel title="Pour chaque collaborateur"><p className="text-sm">Voir ses tâches du jour, organiser son agenda, signaler l&apos;avancement, demander un congé ou un achat, échanger avec ses collègues.</p></Panel>
              <Panel title="Pour l'encadrement"><p className="text-sm">Répartir le travail, valider les tâches terminées, surveiller la charge de l&apos;équipe, conduire les réunions et suivre les objectifs.</p></Panel>
              <Panel title="Pour la Direction"><p className="text-sm">Voir d&apos;un coup d&apos;œil l&apos;état de l&apos;organisation : projets en retard, risques, budget, santé organisationnelle, et simuler des décisions avant de les prendre.</p></Panel>
            </Grid>
          </Chapter>

          {/* 02 */}
          <Chapter id="concepts" intro="Quatre chaînes organisent toute l'application. Si vous les comprenez, vous comprenez où ranger chaque chose.">
            <Panel className="space-y-4">
              <Block label="La structure de l'organisation">
                <Chain items={["Groupe", "Société / Filiale / Agence", "Direction", "Département", "Service", "Équipe", "Personne"]} />
              </Block>
              <Block label="Du cap stratégique au travail quotidien">
                <Chain items={["Vision & axes stratégiques", "Plan annuel / trimestriel / mensuel", "Objectifs & KPI", "Programme", "Projet", "Phase / lot", "Tâche", "Sous-tâche · checklist"]} />
              </Block>
              <Block label="Qui peut faire quoi">
                <Chain separator="+" items={["Rôle (porte les droits)", "Poste (décrit les responsabilités)", "Accès avancés (exceptions individuelles)"]} />
              </Block>
              <Block label="Le monde extérieur">
                <Chain items={["Organisation externe", "Contact", "Opportunité", "Contrat"]} />
                <p className="text-sm text-muted-foreground">Un contact peut aussi être partie prenante d&apos;un projet et recevoir un accès au portail.</p>
              </Block>
            </Panel>
            <Note title="À retenir" tone="info">
              Un <strong>rôle</strong> n&apos;est pas un <strong>poste</strong>. Le rôle (ex. « Manager ») détermine les boutons et menus auxquels on a droit.
              Le poste (ex. « Responsable logistique ») décrit le métier. Deux personnes au même poste peuvent avoir des rôles différents.
            </Note>
          </Chapter>

          {/* 03 */}
          <Chapter id="connexion" intro="L'adresse de l'application ouvre la page de connexion si vous n'êtes pas connecté. Après connexion, vous arrivez sur votre Espace personnel.">
            <Flow
              steps={[
                { title: "Page de connexion", text: "Saisir son e-mail professionnel et son mot de passe." },
                { title: "Code de vérification", text: "Uniquement si la double authentification est activée : code à 6 chiffres de l'application d'authentification du téléphone." },
                { title: "Contrôles", text: "Compte actif ? Mot de passe correct ? Trop de tentatives ? Chaque échec est inscrit au journal de sécurité.", kind: "auto" },
                { title: "Espace personnel", text: "Page d'accueil. Vos droits sont chargés à ce moment." },
              ]}
            />
            <Grid>
              <Panel title="Protections en place">
                <Bullets
                  items={[
                    <>Au-delà de <strong>8 tentatives en 10 minutes</strong> sur un même e-mail (ou 30 depuis une même connexion internet), la connexion est bloquée temporairement.</>,
                    <>Un compte <strong>désactivé</strong> par l&apos;administrateur ne peut plus se connecter.</>,
                    <>La <strong>double authentification</strong> s&apos;active dans Menu profil → Sécurité du compte.</>,
                    <>Dans ce même écran, chacun voit ses <strong>sessions ouvertes</strong> et peut les fermer à distance.</>,
                  ]}
                />
              </Panel>
              <Panel title="Mot de passe oublié">
                <p className="text-sm">Le lien « Mot de passe oublié » existe, mais <strong>l&apos;envoi d&apos;e-mails n&apos;est pas encore activé</strong>. La procédure réelle :</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  <li>La personne prévient l&apos;administrateur.</li>
                  <li>L&apos;administrateur ouvre Administration → Utilisateurs et génère un lien de réinitialisation.</li>
                  <li>Il transmet ce lien à la personne (WhatsApp, en main propre…).</li>
                  <li>La personne choisit un nouveau mot de passe via ce lien.</li>
                </ol>
              </Panel>
            </Grid>
          </Chapter>

          {/* 04 */}
          <Chapter id="ecran" intro="Toutes les pages internes partagent la même structure : un menu à gauche, une barre en haut, le contenu au centre.">
            <div className="grid min-h-80 overflow-hidden rounded-xl border text-sm sm:grid-cols-[190px_minmax(0,1fr)]" aria-label="Schéma de l'écran principal">
              <div className="hidden space-y-3 bg-sidebar p-3 text-sidebar-foreground sm:block">
                <div className="border-b border-white/10 pb-2 font-bold text-white">AfriSime Work-Space</div>
                {[
                  { n: 1, label: "Pour vous", items: ["Tâches", "Mon agenda", "Messagerie"] },
                  { n: 2, label: "Aperçu", items: ["Espace personnel", "Tableaux de bord", "Planning personnel"] },
                  { label: "Travail", items: ["Tâches", "Portefeuille de projets"] },
                  { label: "Collaboration", items: ["Réunions", "Documents"] },
                  { label: "CRM · IA · Administration…", items: [] },
                ].map((g) => (
                  <div key={g.label} className="space-y-0.5">
                    <div className="flex items-center gap-1.5 px-1.5 text-[0.66rem] uppercase tracking-wider text-sidebar-foreground/50">
                      {g.n && <Callout n={g.n} />}
                      {g.label}
                    </div>
                    {g.items.map((item) => (
                      <div key={item} className={item === "Espace personnel" ? "rounded bg-sidebar-accent px-1.5 py-0.5 text-white" : "px-1.5 py-0.5"}>
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-sidebar px-3 py-2.5 text-white">
                  <span>Planifier · Collaborer · Exécuter · Contrôler</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5"><Callout n={3} /> Demandes 2</span>
                    <span className="rounded bg-white/10 px-2 py-0.5">Messagerie 5</span>
                    <span className="rounded bg-white/10 px-2 py-0.5">Courrier</span>
                    <span className="rounded bg-white/10 px-2 py-0.5">Cloche 3</span>
                    <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5"><Callout n={4} /> Profil</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2.5 bg-muted/40 p-3">
                  <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"><strong>Bonjour Awa</strong> · <Callout n={5} /> Briefing du jour et actions prioritaires</div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {["Mes validations en attente", "Mes demandes", "Mes réunions", "Mes projets", "Mes objectifs", "Calendrier 14 jours"].map((c) => (
                      <div key={c} className="rounded-md border bg-card px-3 py-2">{c}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <ul className="space-y-2.5">
              {[
                <><strong>« Pour vous »</strong> : 3 à 5 raccourcis choisis selon votre rôle. Un chef de projet y voit Projets, Tâches, Charge de travail, Risques, Planification ; un directeur y voit Stratégie, Tableaux de bord, Risques, Décisions, Scénarios.</>,
                <><strong>Les groupes du menu</strong> : Aperçu, Travail, Collaboration, Pilotage, CRM, IA, Administration. <strong>Un menu n&apos;apparaît que si vous avez le droit correspondant</strong> : deux collègues peuvent voir des menus différents. Le groupe Administration est replié par défaut.</>,
                <><strong>Raccourcis de la barre du haut</strong> avec compteurs : demandes en attente, messages non lus, courriers à traiter, notifications (cloche).</>,
                <><strong>Menu profil</strong> : Mon profil, Sécurité du compte, Horaires de travail, Notifications, Recherche, Assistant, Guide d&apos;utilisation, Déconnexion.</>,
                <><strong>Espace personnel</strong> : briefing du jour, validations qui vous attendent, notifications, demandes, réunions, calendrier sur 14 jours, messages, documents récents, projets, objectifs et activité récente de l&apos;équipe.</>,
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Callout n={i + 1} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <Note title="Sur téléphone" tone="info">
              L&apos;application s&apos;adapte à l&apos;écran d&apos;un smartphone : le menu s&apos;ouvre avec le bouton en haut à gauche. Elle peut aussi être « installée » sur l&apos;écran d&apos;accueil comme une application.
            </Note>
          </Chapter>

          {/* 05 */}
          <Chapter id="roles" intro="Onze rôles existent. Chacun reçoit par défaut un ensemble de droits, que l'administrateur peut ensuite modifier sans intervention technique.">
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Ce que le rôle peut faire (réglage par défaut)</th>
                    {ROLE_COLUMNS.map((c) => (
                      <th key={c} className="whitespace-nowrap px-2 py-2 text-center font-semibold">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLE_MATRIX.map(([label, values]) => (
                    <tr key={label} className="border-t">
                      <td className="px-3 py-2 font-medium">{label}</td>
                      {values.map((v, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {v === 1 ? <span className="font-bold text-success">●</span> : v === 2 ? <span className="text-muted-foreground">~</span> : <span className="text-muted-foreground/40">·</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              * Externe = Consultant externe, Prestataire, Invité : comptes internes à accès réduit (lecture, commentaires, messagerie). « ~ » : consultants et
              prestataires peuvent commenter, l&apos;invité non. Le <strong>Super Admin</strong> a tous les droits. Ce tableau résume 92 droits ; le détail
              exact se règle dans Administration → Rôles &amp; permissions.
            </p>
            <Grid>
              <Panel title="Modifier les droits d'un rôle"><p className="text-sm">Administration → Rôles &amp; permissions : une grille rôle × droit, cochée ou non. Le changement s&apos;applique à la <strong>prochaine connexion</strong> des personnes concernées.</p></Panel>
              <Panel title="Faire une exception pour une personne"><p className="text-sm">Administration → Accès avancés : accorder ou retirer un droit à une personne, un département, un projet ou une équipe. <strong>Un « Refuser » l&apos;emporte toujours</strong> sur ce que le rôle autorise.</p></Panel>
            </Grid>
          </Chapter>

          {/* 06 */}
          <Chapter id="taches" intro="La tâche est l'unité de base du travail. Presque tout le reste (charge, performance, avancement des projets) se calcule à partir d'elle.">
            <Flow
              steps={[
                { title: "Création", text: "Par un manager ou plus, depuis Tâches ou l'onglet Tâches d'un projet : titre, projet, responsable, co-responsables, dates, priorité, estimation en heures." },
                { title: "Notification", text: "Le responsable reçoit « Nouvelle tâche » dans sa cloche (et sur son téléphone s'il a activé les notifications).", kind: "auto" },
                { title: "Démarrage", text: "Le jour de la date de début, la tâche passe seule à « En cours » (contrôle chaque matin).", kind: "auto" },
                { title: "Exécution", text: "Checklist, sous-tâches, commentaires avec @mentions, documents joints, temps réel passé." },
                { title: "Soumettre à validation", text: "Bouton dans le bloc « Validation » de la fiche. La tâche passe « En révision »." },
                { title: "Décision", text: "Chaque approbateur du circuit, dans l'ordre, clique Approuver ou Refuser avec un commentaire." },
              ]}
            />
            <Panel className="space-y-4">
              <Block label="Les statuts possibles">
                <Chain items={[<Badge key="a" variant="secondary">À faire</Badge>, <Badge key="b" variant="info">En cours</Badge>, <Badge key="c" variant="violet">En révision</Badge>, <Badge key="d" variant="success">Terminée</Badge>]} />
                <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  À côté : <Badge variant="destructive">Bloquée</Badge> empêchée d&apos;avancer · <Badge variant="warning">Reportée</Badge> volontairement repoussée · <Badge variant="outline">Annulée</Badge>
                </div>
              </Block>
              <Block label="Priorités">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="destructive">Très haute</Badge><Badge variant="warning">Haute</Badge><Badge variant="info">Moyenne</Badge><Badge variant="secondary">Basse</Badge>
                </div>
              </Block>
            </Panel>
            <Grid>
              <Panel title="Si la tâche est approuvée">
                <Bullets items={["Elle passe à « Terminée », avancement 100 %.", <>L&apos;avancement du projet est <strong>recalculé automatiquement</strong> (part des tâches terminées).</>, "Le créateur de la tâche est notifié.", "Les règles d'automatisation « tâche terminée » se déclenchent (ex. créer la tâche suivante)."]} />
              </Panel>
              <Panel title="Si la tâche est refusée">
                <Bullets items={["Elle revient à « À faire ».", <>Elle est <strong>renvoyée à son créateur</strong>, qui en redevient responsable.</>, "Le créateur est notifié avec le motif.", "Les règles « validation refusée » se déclenchent."]} />
              </Panel>
            </Grid>
            <Panel title="Ce que contient la fiche d'une tâche">
              <Tags items={["Description", "Checklist", "Sous-tâches", "KPI", "Commentaires", "Documents liés", "Historique des modifications", "Détails", "Origine", "Validation", "Mission externe", "Dépendances"]} />
              <p className="text-sm text-muted-foreground">« Mission externe » permet de confier la tâche à un contact extérieur : elle devient visible dans son portail. « Dépendances » indique qu&apos;une tâche en bloque une autre.</p>
            </Panel>
            <Grid>
              <Panel title="Sept façons d'afficher les tâches">
                <Tags items={["Liste", "Kanban", "Chronologie", "Gantt", "Mind Map", "Tableau blanc", "Portefeuille"]} />
                <p className="text-sm text-muted-foreground">Chacun peut enregistrer sa vue préférée. Le Kanban permet de glisser une carte d&apos;une colonne de statut à l&apos;autre.</p>
              </Panel>
              <Panel title="Bon à savoir">
                <Bullets
                  items={[
                    <>Le responsable et les co-responsables peuvent toujours changer le statut de <em>leur</em> tâche.</>,
                    <>Repousser l&apos;échéance passe par une <strong>demande de changement de date</strong>, acceptée ou refusée par l&apos;encadrement.</>,
                    "Une tâche mère avance toute seule quand ses sous-tâches avancent.",
                    <>Une validation bloquée plus de <strong>3 jours</strong> relance les approbateurs, puis escalade si le circuit le prévoit.</>,
                  ]}
                />
              </Panel>
            </Grid>
            <Note title="Qui valide ?">
              Le circuit (qui approuve, dans quel ordre) se configure dans Administration → Circuits de validation. Chaque étape désigne un <strong>rôle</strong>{" "}
              approbateur : seule une personne ayant ce rôle peut décider à cette étape. Un seul circuit actif à la fois par type.
            </Note>
          </Chapter>

          {/* 07 */}
          <Chapter id="projets" intro="Un projet peut naître d'une idée, d'un appel à projets, d'un modèle, ou être créé directement. Le point d'entrée unique est le Portefeuille de projets.">
            <Flow
              steps={[
                { title: "Idée", text: "Laboratoire d'idées : on dépose une intuition." },
                { title: "Étude", text: "À étudier → Étude de faisabilité → Approuvée → En conception." },
                { title: "Conversion", text: "Bouton « Convertir en projet ». L'idée passe au statut « Projet créé »." },
                { title: "Conception", text: "Dans Project Studio : diagnostic, arbre des problèmes, cadre logique, charte…" },
                { title: "Exécution", text: "Tâches, jalons, livrables, réunions, budget, risques." },
                { title: "Clôture", text: "Bilan, clôture formelle, leçons apprises (capitalisation)." },
              ]}
            />
            <Panel className="space-y-2">
              <Block label="Statuts d'un projet">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <Chain items={[<Badge key="a" variant="secondary">Planifié</Badge>, <Badge key="b" variant="violet">Prêt pour exécution</Badge>, <Badge key="c" variant="info">En cours</Badge>, <Badge key="d" variant="success">Terminé</Badge>]} />
                  <span className="text-muted-foreground">· à tout moment :</span>
                  <Badge variant="warning">En pause</Badge>
                  <Badge variant="destructive">Annulé</Badge>
                </div>
              </Block>
              <p className="text-sm text-muted-foreground">Le passage à « Prêt pour exécution » peut déclencher un playbook de mise en route (vérifier ressources et risques, créer les premières tâches). Un projet dont la date de début arrive passe seul « En cours ».</p>
            </Panel>
            <h3 className="text-xl font-semibold">La fiche projet : 18 onglets</h3>
            <Panel>
              <Tags items={["Aperçu", "Pilotage", "Tâches", "Timeline", "Gantt", "Jalons", "Livrables", "Risques", "Parties prenantes", "Décisions", "Ressources", "Équipe", "Charge de travail", "Réunions", "Rapports", "Documents", "Discussion", "Automatisations"]} />
              <p className="text-sm">En haut de la fiche : le nom, le <strong>sélecteur de statut</strong> (si vous pouvez modifier le projet), le bouton <strong>Supprimer</strong> (va dans la corbeille, restaurable), les étiquettes, et le bouton <strong>Project Studio</strong>. L&apos;onglet Discussion est un fil de conversation propre au projet.</p>
            </Panel>
            <h3 className="text-xl font-semibold">Project Studio : la boîte à outils méthodologique</h3>
            <p className="max-w-3xl text-muted-foreground">Un espace par projet, organisé en 8 familles qui suivent le cycle de vie d&apos;un projet de développement, de la conception à l&apos;impact.</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {STUDIO.map(([title, text], i) => (
                <Panel key={title} title={<><span className="mr-1.5 font-mono text-xs text-primary">{i + 1}</span>{title}</>}>
                  <p className="text-sm">{text}</p>
                </Panel>
              ))}
            </div>
            <Panel title="Autres vues du portefeuille">
              <p className="text-sm"><strong>Control Tower</strong> (planning, budget, risques, qualité, livrables, impact de tous les projets) · <strong>Roadmap</strong> (tous les projets sur une même frise) · <strong>Calendrier des projets</strong> (dates et jalons) · <strong>Carte</strong> (projets localisés) · <strong>Modèles</strong> (partir d&apos;un projet type) · <strong>Appels à projets</strong> (opportunités de financement à suivre, puis convertir en projet).</p>
            </Panel>
            <Note title="Deux notions à ne pas confondre" tone="info">
              Une <strong>demande de modification de projet</strong> (Project Studio → Modifications) concerne le périmètre, le budget ou le calendrier d&apos;un projet.
              Un <strong>contrat de projet</strong> (Achats) lie un fournisseur. Ils sont distincts des demandes de changement organisationnelles et des contrats commerciaux du CRM.
            </Note>
          </Chapter>

          {/* 08 */}
          <Chapter id="demandes" intro="Les demandes remplacent les formulaires papier et les validations par e-mail.">
            <Panel title="Types de demandes">
              <Tags items={["Achat", "Mission", "Décaissement", "Matériel", "Autorisation", "Recrutement", "Autre"]} />
            </Panel>
            <Flow
              steps={[
                { title: "Soumission", text: "Depuis Demandes (raccourci en haut de l'écran) : type, objet, montant éventuel, justificatif." },
                { title: "Choix du circuit", text: "L'app choisit le circuit le plus précis : d'abord un circuit propre à ce type, puis selon le montant (au-delà d'un seuil, une étape de plus).", kind: "auto" },
                { title: "Approbations", text: "Chaque approbateur est notifié à son tour, approuve ou refuse." },
                { title: "Résultat", text: "« Approuvée » ou « Rejetée ». Le demandeur est notifié à chaque étape." },
              ]}
            />
            <Note title="Si aucun circuit n'est configuré pour ce type">
              La demande ne peut pas être soumise. Le demandeur voit un message clair et les personnes qui gèrent les circuits sont alertées automatiquement pour y remédier.
            </Note>
            <Grid>
              <Panel title="Congés"><p className="text-sm">Demande depuis le Calendrier : congé payé, maladie ou autre. Statut : En attente → Approuvé ou Refusé (par un manager ou plus). L&apos;historique est dans Historique des congés. Un congé approuvé libère ou réorganise automatiquement les créneaux du planning personnel.</p></Panel>
              <Panel title="Courrier"><p className="text-sm">Registre du courrier <strong>entrant, sortant et interne</strong>, avec statut À traiter → En cours → Traité → Archivé. Le compteur en haut de l&apos;écran indique les courriers à traiter.</p></Panel>
            </Grid>
          </Chapter>

          {/* 09 */}
          <Chapter id="planning" intro="Un agenda de travail individuel qui relie les tâches assignées aux créneaux horaires réels de la journée.">
            <Grid>
              <Panel title="Une journée type">
                <ol className="ml-2 border-l-2">
                  {[
                    ["Matin · Ma journée", "Ce qui est prévu aujourd'hui, les retards, les conflits d'horaires."],
                    ["À planifier (inbox)", "Les tâches reçues sans créneau. On les glisse dans l'agenda, on les lie à une activité ou on les supprime."],
                    ["Pendant la journée", "Agenda en vue jour, semaine ou mois. Glisser-déposer pour déplacer une activité. Capture rapide d'une idée."],
                    ["Fin de journée", "Bouton « Fin de journée » : bilan rapide, notes personnelles (visibles par vous seul), report de ce qui n'est pas fini."],
                  ].map(([t, d]) => (
                    <li key={t} className="relative pb-3 pl-5 before:absolute before:-left-[7px] before:top-1.5 before:h-3 before:w-3 before:rounded-full before:border-2 before:border-primary before:bg-card">
                      <div className="font-semibold">{t}</div>
                      <div className="text-sm text-muted-foreground">{d}</div>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel title="Les écrans du planning">
                <p className="text-sm">Ma journée · Agenda · Calendrier · À planifier · Mes tâches · Mes réunions · Missions et déplacements · Récurrences · Mes objectifs · Temps / Charge · Ma performance · Historique · Journal d&apos;activité · Bilans · Demandes de créneau · Paramètres (horaires de travail).</p>
                <h4 className="pt-1 font-semibold">Qui voit mon planning ?</h4>
                <Bullets
                  items={[
                    <><strong>Mes collègues</strong> : seulement « occupé / libre ».</>,
                    <><strong>Mon manager direct et mon chef d&apos;équipe</strong> : le détail, en lecture seule.</>,
                    <><strong>Une personne à qui je partage</strong> mon agenda (ex. une assistante) : lecture seule ou modification, selon mon choix.</>,
                    <>Mes <strong>bilans et notes</strong> : moi seul.</>,
                  ]}
                />
              </Panel>
            </Grid>
            <Panel title="Demander un créneau à un collègue">
              <p className="text-sm">Plutôt que d&apos;écrire « tu es dispo quand ? », on envoie une <strong>demande de créneau</strong> ou une <strong>demande de réaffectation</strong>. Le collègue accepte ou refuse depuis son planning ; l&apos;app propose des créneaux libres compatibles avec ses horaires et les jours fériés. Pour l&apos;encadrement, Workforce Control montre la charge, les retards et les blocages de toute l&apos;organisation.</p>
            </Panel>
          </Chapter>

          {/* 10 */}
          <Chapter id="collab">
            <Grid cols={3}>
              <Panel title="Réunions">
                <Tags items={["Ordre du jour", "Compte rendu", "Décisions & actions", "Documents liés", "Participants", "Participants externes"]} />
                <p className="text-sm text-muted-foreground">Les réunions peuvent être récurrentes (série). Un contact externe invité répond présent / absent depuis son portail.</p>
              </Panel>
              <Panel title="Documents">
                <p className="text-sm">Classement par dossiers, <strong>versions successives</strong> d&apos;un même fichier (on ne perd jamais l&apos;ancienne version), aperçu en ligne quand le format le permet, rattachement à un projet, une tâche ou une réunion. Un document peut être partagé vers le portail externe.</p>
              </Panel>
              <Panel title="Messagerie">
                <p className="text-sm">Conversations directes et de groupe, plus un fil de discussion par projet et par équipe. Les @mentions notifient la personne citée. Les messages des contacts externes (portail) arrivent aussi ici.</p>
              </Panel>
            </Grid>
            <Grid>
              <Panel title="Calendrier"><p className="text-sm">Vue consolidée de <strong>mes tâches, réunions, congés, missions et événements</strong>. C&apos;est aussi là qu&apos;on demande un congé ou crée un événement.</p></Panel>
              <Panel title="Base de connaissances et recherche"><p className="text-sm">Le wiki interne (procédures, guides, bonnes pratiques par catégorie). La <strong>Recherche globale</strong> trouve personnes, projets, tâches, documents, contrats, décisions, réunions, partenaires, processus, risques et articles, même avec une faute de frappe.</p></Panel>
            </Grid>
          </Chapter>

          {/* 11 */}
          <Chapter id="crm" intro="Le CRM gère les relations avec l'extérieur. Le portail donne à ces personnes un accès limité et sécurisé.">
            <Panel className="space-y-4">
              <Block label="Pipeline commercial : étapes d'une opportunité">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <Chain items={[<Badge key="a" variant="secondary">Nouveau</Badge>, <Badge key="b" variant="info">Qualification</Badge>, <Badge key="c" variant="info">Proposition</Badge>, <Badge key="d" variant="violet">Négociation</Badge>, <Badge key="e" variant="success">Gagnée</Badge>]} />
                  <span className="text-muted-foreground">ou</span>
                  <Badge variant="destructive">Perdue</Badge>
                </div>
              </Block>
              <Block label="Types de contacts">
                <Tags items={["Client", "Prospect", "Partenaire", "Fournisseur", "Consultant", "Prestataire", "Candidat", "Membre", "Investisseur"]} />
              </Block>
            </Panel>
            <Grid>
              <Panel title="Fiche contact"><p className="text-sm">Informations, <strong>historique des interactions</strong> (appels, e-mails, rendez-vous), cartographie des relations, opportunités, fiche 360°. Un contact sans interaction depuis <strong>30 jours</strong> déclenche une alerte de relance.</p></Panel>
              <Panel title="Pipeline"><p className="text-sm">Tableau en colonnes : on fait glisser une opportunité d&apos;une étape à l&apos;autre. Une opportunité gagnée peut donner lieu à un contrat, suivi jusqu&apos;à son expiration (alerte automatique).</p></Panel>
            </Grid>
            <h3 className="text-xl font-semibold">Le portail externe</h3>
            <p className="max-w-3xl text-muted-foreground">Un seul portail pour tous les profils externes : client, partenaire, fournisseur, investisseur, institution. Chacun n&apos;y voit que les projets auxquels il est rattaché.</p>
            <Flow
              steps={[
                { title: "Fiche contact", text: "Un utilisateur interne (manager ou plus) ouvre le contact. Il doit avoir un e-mail." },
                { title: "Créer l'accès portail", text: "L'app génère un lien d'activation." },
                { title: "Transmission", text: "Le lien est copié et envoyé à la main (pas d'e-mail automatique pour l'instant).", kind: "ext" },
                { title: "Activation", text: "Le contact choisit son mot de passe sur la page d'activation.", kind: "ext" },
                { title: "Connexion portail", text: "Session valable 30 jours, totalement séparée des comptes internes.", kind: "ext" },
              ]}
            />
            <Grid>
              <Panel title="Ce que voit l'externe">
                <Bullets items={["Mes projets (avancement, documents partagés)", "Missions : les tâches qui lui ont été déléguées", "Réunions : invitations, réponse présent / absent", "Messages avec l'équipe interne", "Programmes, actualités, opportunités qui le concernent"]} />
              </Panel>
              <Panel title="Ce que contrôle l'interne">
                <Bullets items={["Ce qui est partagé : chaque document ou élément a un interrupteur « partage externe »", "Les droits du compte portail", "Renvoyer une invitation, révoquer puis réactiver l'accès"]} />
              </Panel>
            </Grid>
          </Chapter>

          {/* 12 */}
          <Chapter
            id="pilotage"
            intro="Ces écrans ne créent pas de travail : ils lisent les données déjà saisies (tâches, projets, risques…) et les transforment en indicateurs. Leur qualité dépend directement de la rigueur de saisie de chacun."
          >
            <Grid cols={3}>
              <Panel title="Tableaux de bord"><p className="text-sm">8 widgets configurables : charge de travail, indicateurs RH, performance par département, productivité par équipe, respect des délais, avancement des projets, temps passé, tâches en retard.</p></Panel>
              <Panel title="Niveaux de pilotage"><p className="text-sm">On part de l&apos;organisation entière et on descend : Direction → Département → Service → Équipe → Projet → Individu. Chaque niveau cumule les indicateurs de ses sous-niveaux.</p></Panel>
              <Panel title="Centre de commande"><p className="text-sm">Vue instantanée réservée aux dirigeants : ce qui brûle, ce qui est en retard, ce qui attend une décision.</p></Panel>
              <Panel title="Santé organisationnelle"><p className="text-sm">Un score de 0 à 100, moyenne pondérée de 9 dimensions : performance, charge, risques, projets, processus, qualité, gouvernance, satisfaction, respect des échéances. Chaque dimension est expliquée et son poids est réglable.</p></Panel>
              <Panel title="Charge de travail"><p className="text-sm">Pour chaque personne : nombre de tâches, taux d&apos;occupation, disponibilité. <strong>Sous-charge</strong> sous 70 %, <strong>surcharge</strong> au-delà de 100 % (alerte hebdomadaire).</p></Panel>
              <Panel title="Simuler avant de décider"><p className="text-sm"><strong>Scénarios</strong> et <strong>What-If</strong> : modifier virtuellement effectif, budget, délais, projets, puis comparer avec la situation actuelle. <strong>Salle de simulation</strong> : même principe, réservé à la Direction.</p></Panel>
            </Grid>
          </Chapter>

          {/* 13 */}
          <Chapter id="auto" intro="Certaines actions n'ont besoin de personne. Elles expliquent pourquoi des notifications apparaissent « d'elles-mêmes ».">
            <Grid>
              <Panel title="Chaque jour à 6 h (heure GMT)">
                <Bullets
                  items={[
                    "Tâches et projets dont la date de début est arrivée → « En cours »",
                    "Alertes d'échéance proche et rappels de planning",
                    "Objectifs et projets en retard",
                    "Validations bloquées depuis plus de 3 jours → relance, puis escalade",
                    "Clients sans suivi depuis 30 jours, relances planifiées",
                    "Contrats expirés, budgets dépassés",
                    "Tâches très prioritaires non traitées",
                    "Règles d'automatisation quotidiennes",
                    "Photo des indicateurs du jour (pour les courbes d'évolution)",
                    "Analyses des agents (retards, risques, écarts d'objectifs), dépendances à risque, signaux faibles",
                    "Nettoyage des anciens journaux selon la politique de conservation",
                  ]}
                />
              </Panel>
              <Panel title="Chaque lundi à 7 h">
                <Bullets items={["Revue hebdomadaire envoyée en notification (une par personne et par semaine)", "Alerte de surcharge, une fois par semaine maximum"]} />
                <h4 className="pt-1 font-semibold">À chaque action</h4>
                <Bullets
                  items={[
                    "L'avancement d'un projet se recalcule dès qu'une tâche change",
                    "Une tâche mère suit ses sous-tâches",
                    <>Chaque création, modification ou suppression est inscrite au <strong>journal d&apos;audit</strong> (qui, quoi, quand)</>,
                    <>Une suppression envoie l&apos;élément à la <strong>corbeille</strong> ; rien n&apos;est effacé définitivement sans action manuelle</>,
                  ]}
                />
              </Panel>
            </Grid>
            <h3 className="text-xl font-semibold">Les règles d&apos;automatisation</h3>
            <p className="max-w-3xl text-muted-foreground">
              Dans Automatisations (ou l&apos;onglet du même nom d&apos;un projet), on écrit des règles du type « <strong>quand</strong> ceci arrive, <strong>si</strong> telle
              condition, <strong>alors</strong> faire cela ». Orchestration enchaîne plusieurs actions à partir d&apos;un seul déclencheur (playbook).
            </p>
            <Grid>
              <Panel title="Quand… (déclencheurs)"><p className="text-sm">Tâche créée, terminée, en retard, statut changé, validation refusée · échéance proche · projet terminé, en retard, statut changé · budget dépassé · risque critique ou créé · opportunité, décision, réunion ou événement créé.</p></Panel>
              <Panel title="Alors… (actions)"><p className="text-sm">Créer la tâche suivante · envoyer un rappel · notifier les parties prenantes · escalader au manager · marquer bloquée · assigner une personne · changer un statut · créer une réunion, une demande, un risque · générer un rapport · demander une validation · lancer un playbook · vérifier ressources et risques.</p></Panel>
            </Grid>
            <Note title="Garde-fou permanent">
              Les actions sensibles (changer un statut, demander une validation, envoyer un e-mail…) ne s&apos;exécutent <strong>jamais</strong> sans validation humaine,
              même si la règle est réglée en « automatique ». Elles attendent dans Gouvernance IA, sur trois niveaux : Suggestion, Validation humaine, Automatisation autorisée.
            </Note>
            <Panel title="Notifications">
              <p className="text-sm">Toujours dans la <strong>cloche</strong> de l&apos;application. Aussi sur le <strong>téléphone ou l&apos;ordinateur</strong> si chacun l&apos;active pour son appareil dans Menu profil → Notifications. Types : nouvelle tâche, modification, commentaire, mention, validation, échéance proche, retard, surcharge, client sans suivi, budget dépassé, relance, tâche critique, contrat expiré, rapport hebdomadaire…</p>
            </Panel>
          </Chapter>

          {/* 14 */}
          <Chapter id="catalogue" intro="Chaque écran de l'application, dans l'ordre du menu. L'étiquette indique qui y a accès avec les réglages par défaut. Cliquez une adresse pour ouvrir l'écran.">
            <GuideCatalog />
            <Note title="Lecture des étiquettes" tone="info">
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="success">Tous</Badge> tous les comptes internes · <Badge variant="info">Collaborateur +</Badge> hors comptes externes ·{" "}
                <Badge variant="info">Manager +</Badge> · <Badge variant="violet">Chef de projet +</Badge> · <Badge variant="violet">Chef de dép. +</Badge> ·{" "}
                <Badge variant="warning">Direction</Badge> DG et directeurs · <Badge>DG / Admin</Badge>. Le Super Admin voit tout.
              </span>
            </Note>
          </Chapter>

          {/* 15 */}
          <Chapter id="limites" intro="Ce qui existe dans l'interface mais ne fonctionne pas encore pleinement, pour éviter les mauvaises surprises.">
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Sujet</th>
                    <th className="px-3 py-2 text-left font-semibold">Situation réelle</th>
                    <th className="px-3 py-2 text-left font-semibold">Conséquence pour l&apos;utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {LIMITS.map(([subject, reality, impact]) => (
                    <tr key={subject} className="border-t align-top">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">{subject}</td>
                      <td className="min-w-56 px-3 py-2">{reality}</td>
                      <td className="min-w-56 px-3 py-2 text-muted-foreground">{impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Chapter>

          {/* 16 */}
          <Chapter id="glossaire">
            <dl className="grid gap-x-8 md:grid-cols-2">
              {GLOSSARY.map(([term, def]) => (
                <div key={term} className="border-b py-2.5">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="text-sm text-muted-foreground">{def}</dd>
                </div>
              ))}
            </dl>
          </Chapter>

          {/* 17 */}
          <Chapter id="faq">
            <div className="space-y-2">
              {FAQ.map(([q, a]) => (
                <details key={q} className="rounded-lg border bg-card px-4 py-3">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="mt-2 max-w-3xl text-sm">{a}</p>
                </details>
              ))}
            </div>
            <p className="border-t pt-4 text-sm text-muted-foreground">
              Les droits indiqués sont les réglages par défaut : l&apos;administration peut les modifier à tout moment. Une question non couverte ? Adressez-vous à l&apos;administrateur de la plateforme.
            </p>
          </Chapter>
        </div>
      </div>
    </div>
  );
}
