"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { runOpportunityCreatedRules } from "@/lib/automation";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  createContactSchema,
  updateContactSchema,
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStatusSchema,
  createInteractionSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type CreateContactInput,
  type UpdateContactInput,
  type CreateOpportunityInput,
  type UpdateOpportunityInput,
  type UpdateOpportunityStatusInput,
  type CreateInteractionInput,
} from "@/lib/validations/crm.schema";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export async function createOrganization(input: CreateOrganizationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = createOrganizationSchema.parse(input);

  const organization = await prisma.crmOrganization.create({
    data: {
      nom: data.nom,
      type: data.type,
      secteur: data.secteur || undefined,
      siteWeb: data.siteWeb || undefined,
      telephone: data.telephone || undefined,
      email: data.email || undefined,
      adresse: data.adresse || undefined,
      notes: data.notes || undefined,
      ownerId: data.ownerId || session.user.id,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.organization.created",
    entityType: "CrmOrganization",
    entityId: organization.id,
    changes: { nom: organization.nom },
  });

  revalidatePath("/crm/organisations");
  revalidatePath("/crm");
  return organization;
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = updateOrganizationSchema.parse(input);

  const organization = await prisma.crmOrganization.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      type: data.type,
      secteur: data.secteur || undefined,
      siteWeb: data.siteWeb || undefined,
      telephone: data.telephone || undefined,
      email: data.email || undefined,
      adresse: data.adresse || undefined,
      notes: data.notes || undefined,
      ownerId: data.ownerId || undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.organization.updated",
    entityType: "CrmOrganization",
    entityId: organization.id,
    changes: { nom: organization.nom },
  });

  revalidatePath(`/crm/organisations/${data.id}`);
  revalidatePath("/crm/organisations");
  return organization;
}

export async function createContact(input: CreateContactInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = createContactSchema.parse(input);

  const contact = await prisma.crmContact.create({
    data: {
      prenom: data.prenom,
      nom: data.nom,
      email: data.email || undefined,
      telephone: data.telephone || undefined,
      fonction: data.fonction || undefined,
      type: data.type,
      source: data.source || undefined,
      organizationId: data.organizationId || undefined,
      notes: data.notes || undefined,
      ownerId: data.ownerId || session.user.id,
      createdById: session.user.id,
      score: data.score,
      segment: data.segment || undefined,
      prochaineRelance: data.prochaineRelance ? new Date(data.prochaineRelance) : undefined,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.contact.created",
    entityType: "CrmContact",
    entityId: contact.id,
    changes: { nom: `${contact.prenom} ${contact.nom}` },
  });

  revalidatePath("/crm/contacts");
  revalidatePath("/crm");
  return contact;
}

export async function updateContact(input: UpdateContactInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = updateContactSchema.parse(input);
  const newEmail = data.email || undefined;

  const existing = await prisma.crmContact.findUnique({
    where: { id: data.id },
    select: { portalAccount: { select: { id: true, email: true } } },
  });

  // PortalAccount.email (unique, identifiant de connexion du portail externe)
  // est copie depuis CrmContact.email a la creation du compte
  // (createPortalAccount) mais ne se resynchronise jamais tout seul ensuite —
  // sans ce garde-fou, changer l'email d'un contact ayant deja un acces
  // portail desynchronise silencieusement son identifiant de connexion.
  if (existing?.portalAccount && !newEmail) {
    throw new Error(
      "Impossible de retirer l'email : ce contact a un accès portail actif qui nécessite un email de connexion. Révoquez d'abord l'accès portail."
    );
  }

  let contact;
  try {
    contact = await prisma.$transaction(async (tx) => {
      const updated = await tx.crmContact.update({
        where: { id: data.id },
        data: {
          prenom: data.prenom,
          nom: data.nom,
          email: newEmail,
          telephone: data.telephone || undefined,
          fonction: data.fonction || undefined,
          type: data.type,
          source: data.source || undefined,
          organizationId: data.organizationId || undefined,
          notes: data.notes || undefined,
          ownerId: data.ownerId || undefined,
          score: data.score,
          segment: data.segment || undefined,
          prochaineRelance: data.prochaineRelance ? new Date(data.prochaineRelance) : data.prochaineRelance === "" ? null : undefined,
        },
      });

      if (existing?.portalAccount && newEmail && newEmail !== existing.portalAccount.email) {
        await tx.portalAccount.update({
          where: { id: existing.portalAccount.id },
          data: { email: newEmail },
        });
      }

      return updated;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("Cet email est déjà utilisé par un autre accès portail.");
    }
    throw error;
  }

  await logAudit({
    userId: session.user.id,
    action: "crm.contact.updated",
    entityType: "CrmContact",
    entityId: contact.id,
    changes: { nom: `${contact.prenom} ${contact.nom}` },
  });

  revalidatePath(`/crm/contacts/${data.id}`);
  revalidatePath("/crm/contacts");
  if (existing?.portalAccount) revalidatePath("/ecosysteme");
  return contact;
}

export async function createOpportunity(input: CreateOpportunityInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = createOpportunitySchema.parse(input);

  const opportunity = await prisma.crmOpportunity.create({
    data: {
      nom: data.nom,
      contactId: data.contactId || undefined,
      organizationId: data.organizationId || undefined,
      montantEstime: data.montantEstime ? Number(data.montantEstime) : undefined,
      probabilite: data.probabilite,
      source: data.source || undefined,
      dateClotureEstimee: data.dateClotureEstimee ? new Date(data.dateClotureEstimee) : undefined,
      notes: data.notes || undefined,
      ownerId: data.ownerId,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.opportunity.created",
    entityType: "CrmOpportunity",
    entityId: opportunity.id,
    changes: { nom: opportunity.nom },
  });

  await runOpportunityCreatedRules({
    id: opportunity.id,
    nom: opportunity.nom,
    ownerId: opportunity.ownerId,
    montantEstime: opportunity.montantEstime ? Number(opportunity.montantEstime) : null,
    probabilite: opportunity.probabilite,
  });

  revalidatePath("/crm/pipeline");
  revalidatePath("/crm");
  return { ...opportunity, montantEstime: opportunity.montantEstime ? Number(opportunity.montantEstime) : null };
}

export async function updateOpportunity(input: UpdateOpportunityInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = updateOpportunitySchema.parse(input);

  const opportunity = await prisma.crmOpportunity.update({
    where: { id: data.id },
    data: {
      nom: data.nom,
      contactId: data.contactId || undefined,
      organizationId: data.organizationId || undefined,
      montantEstime: data.montantEstime ? Number(data.montantEstime) : undefined,
      probabilite: data.probabilite,
      source: data.source || undefined,
      dateClotureEstimee: data.dateClotureEstimee ? new Date(data.dateClotureEstimee) : undefined,
      notes: data.notes || undefined,
      ownerId: data.ownerId,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.opportunity.updated",
    entityType: "CrmOpportunity",
    entityId: opportunity.id,
    changes: { nom: opportunity.nom },
  });

  revalidatePath(`/crm/opportunites/${data.id}`);
  revalidatePath("/crm/pipeline");
  return { ...opportunity, montantEstime: opportunity.montantEstime ? Number(opportunity.montantEstime) : null };
}

/** Changement de statut (drag-and-drop du pipeline ou sélecteur sur la fiche) — miroir d'updateTaskStatus. */
export async function updateOpportunityStatus(input: UpdateOpportunityStatusInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = updateOpportunityStatusSchema.parse(input);

  const opportunity = await prisma.crmOpportunity.update({
    where: { id: data.id },
    data: {
      statut: data.statut,
      raisonPerte: data.statut === "PERDUE" ? data.raisonPerte || undefined : null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.opportunity.status_changed",
    entityType: "CrmOpportunity",
    entityId: opportunity.id,
    changes: { statut: data.statut },
  });

  revalidatePath("/crm/pipeline");
  revalidatePath(`/crm/opportunites/${data.id}`);
  revalidatePath("/crm");
  return { ...opportunity, montantEstime: opportunity.montantEstime ? Number(opportunity.montantEstime) : null };
}

export async function addInteraction(input: CreateInteractionInput) {
  const session = await requireSession();
  requirePermission(session.user.permissions, PERMISSIONS.CRM_MANAGE);
  const data = createInteractionSchema.parse(input);

  const interaction = await prisma.crmInteraction.create({
    data: {
      type: data.type,
      contenu: data.contenu,
      dateInteraction: data.dateInteraction ? new Date(data.dateInteraction) : undefined,
      contactId: data.contactId || undefined,
      organizationId: data.organizationId || undefined,
      opportunityId: data.opportunityId || undefined,
      authorId: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "crm.interaction.created",
    entityType: "CrmInteraction",
    entityId: interaction.id,
    changes: { type: interaction.type },
  });

  if (data.contactId) revalidatePath(`/crm/contacts/${data.contactId}`);
  if (data.organizationId) revalidatePath(`/crm/organisations/${data.organizationId}`);
  if (data.opportunityId) revalidatePath(`/crm/opportunites/${data.opportunityId}`);
  return interaction;
}
