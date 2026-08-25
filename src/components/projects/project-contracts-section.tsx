"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "@/hooks/use-action";
import {
  createProjectContract,
  updateProjectContractStatut,
  evaluateProjectContract,
  linkDeliverableToContract,
  createContractPayment,
  updateContractPaymentStatut,
} from "@/actions/project-contract.actions";
import {
  createProjectContractSchema,
  createContractPaymentSchema,
  type CreateProjectContractInput,
  type CreateContractPaymentInput,
} from "@/lib/validations/project-contract.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const STATUT_LABELS: Record<string, string> = { ACTIF: "Actif", EXPIRE: "Expiré", RESILIE: "Résilié" };
const PAYMENT_STATUT_LABELS: Record<string, string> = { PREVU: "Prévu", PAYE: "Payé", EN_RETARD: "En retard" };

export type ContractPaymentRow = { id: string; montant: number; datePaiement: string | null; statut: string; reference: string | null };

export type ContractRow = {
  id: string;
  nom: string;
  fournisseurNom: string;
  montant: number | null;
  statut: string;
  evaluationNote: number | null;
  evaluationCommentaire: string | null;
  deliverableNoms: string[];
  payments: ContractPaymentRow[];
};

/** Contract Management (Project Studio §35) — Projet -> Contrat -> Fournisseur -> Livrables -> Paiements -> Évaluation. */
export function ProjectContractsSection({
  projectId,
  contracts,
  fournisseurs,
  unlinkedDeliverables,
  devise,
  canManage,
}: {
  projectId: string;
  contracts: ContractRow[];
  fournisseurs: { id: string; label: string }[];
  unlinkedDeliverables: { id: string; label: string }[];
  devise: string;
  canManage: boolean;
}) {
  const { run: setStatut } = useAction(updateProjectContractStatut, { successMessage: "Statut mis à jour." });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Contrats fournisseurs liés à ce projet.</p>
        {canManage && <ContractFormDialog projectId={projectId} fournisseurs={fournisseurs} />}
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun contrat enregistré.</p>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Card key={c.id} size="sm">
              <CardContent className="space-y-2 px-(--card-spacing)">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.nom}</div>
                    <p className="text-xs text-muted-foreground">
                      Fournisseur : {c.fournisseurNom}
                      {c.montant != null && ` — ${c.montant.toLocaleString("fr-FR")} ${devise}`}
                    </p>
                  </div>
                  {canManage ? (
                    <Select value={c.statut} onValueChange={(v) => setStatut({ contractId: c.id, statut: v as never })}>
                      <SelectTrigger className="h-7 w-auto text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{STATUT_LABELS[c.statut]}</Badge>
                  )}
                </div>

                <DeliverablesRow contractId={c.id} deliverableNoms={c.deliverableNoms} unlinkedDeliverables={unlinkedDeliverables} canManage={canManage} />
                <PaymentsRow contractId={c.id} payments={c.payments} devise={devise} canManage={canManage} />
                <EvaluationRow contractId={c.id} note={c.evaluationNote} commentaire={c.evaluationCommentaire} canManage={canManage} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliverablesRow({
  contractId,
  deliverableNoms,
  unlinkedDeliverables,
  canManage,
}: {
  contractId: string;
  deliverableNoms: string[];
  unlinkedDeliverables: { id: string; label: string }[];
  canManage: boolean;
}) {
  const { run: link } = useAction(linkDeliverableToContract, { successMessage: "Livrable lié." });

  return (
    <div className="space-y-1 border-t pt-2">
      <p className="text-xs font-medium text-muted-foreground">Livrables</p>
      {deliverableNoms.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun livrable lié.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {deliverableNoms.map((nom) => (
            <Badge key={nom} variant="secondary">
              {nom}
            </Badge>
          ))}
        </div>
      )}
      {canManage && unlinkedDeliverables.length > 0 && (
        <Select onValueChange={(v) => link({ contractId, deliverableId: v })}>
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue placeholder="Lier un livrable..." />
          </SelectTrigger>
          <SelectContent>
            {unlinkedDeliverables.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function PaymentsRow({
  contractId,
  payments,
  devise,
  canManage,
}: {
  contractId: string;
  payments: ContractPaymentRow[];
  devise: string;
  canManage: boolean;
}) {
  const { run: setStatut } = useAction(updateContractPaymentStatut, { successMessage: "Statut mis à jour." });

  return (
    <div className="space-y-1 border-t pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Paiements</p>
        {canManage && <PaymentFormDialog contractId={contractId} />}
      </div>
      {payments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun paiement enregistré.</p>
      ) : (
        <ul className="space-y-1">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
              <span>
                {p.montant.toLocaleString("fr-FR")} {devise}
                {p.datePaiement && ` — ${new Date(p.datePaiement).toLocaleDateString("fr-FR")}`}
                {p.reference && ` (${p.reference})`}
              </span>
              {canManage ? (
                <Select value={p.statut} onValueChange={(v) => setStatut({ paymentId: p.id, statut: v as never })}>
                  <SelectTrigger className="h-6 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_STATUT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{PAYMENT_STATUT_LABELS[p.statut]}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EvaluationRow({
  contractId,
  note,
  commentaire,
  canManage,
}: {
  contractId: string;
  note: number | null;
  commentaire: string | null;
  canManage: boolean;
}) {
  const [value, setValue] = useState(note?.toString() ?? "");
  const [comment, setComment] = useState(commentaire ?? "");
  const { run: evaluate } = useAction(evaluateProjectContract, { successMessage: "Évaluation enregistrée." });

  if (!canManage) {
    return note != null ? (
      <p className="border-t pt-2 text-xs text-muted-foreground">
        Évaluation : {note}/5{commentaire && ` — ${commentaire}`}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-1 border-t pt-2">
      <p className="text-xs font-medium text-muted-foreground">Évaluation du fournisseur (0-5)</p>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={5}
          className="h-7 w-16 text-xs"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => value && evaluate({ contractId, evaluationNote: Number(value), evaluationCommentaire: comment })}
        />
        <Input
          placeholder="Commentaire"
          className="h-7 flex-1 text-xs"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => value && evaluate({ contractId, evaluationNote: Number(value), evaluationCommentaire: comment })}
        />
      </div>
    </div>
  );
}

function ContractFormDialog({ projectId, fournisseurs }: { projectId: string; fournisseurs: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateProjectContractInput>({
    resolver: zodResolver(createProjectContractSchema),
    defaultValues: { projectId },
  });
  const { run: submit, isPending } = useAction(createProjectContract, { successMessage: "Contrat ajouté." });

  async function onSubmit(data: CreateProjectContractInput) {
    const result = await submit({ ...data, projectId });
    if (result.ok) {
      reset({ projectId });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un contrat fournisseur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pc-nom">Nom du contrat</Label>
            <Input id="pc-nom" {...register("nom")} />
            {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select onValueChange={(v) => setValue("fournisseurId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {fournisseurs.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fournisseurId && <p className="text-sm text-destructive">{errors.fournisseurId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-montant">Montant</Label>
            <Input id="pc-montant" type="number" step="0.01" {...register("montant")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pc-signature">Date de signature</Label>
              <Input id="pc-signature" type="date" {...register("dateSignature")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pc-expiration">Date d&apos;expiration</Label>
              <Input id="pc-expiration" type="date" {...register("dateExpiration")} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentFormDialog({ contractId }: { contractId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContractPaymentInput>({
    resolver: zodResolver(createContractPaymentSchema),
    defaultValues: { contractId, statut: "PREVU" },
  });
  const { run: submit, isPending } = useAction(createContractPayment, { successMessage: "Paiement ajouté." });

  async function onSubmit(data: CreateContractPaymentInput) {
    const result = await submit({ ...data, contractId });
    if (result.ok) {
      reset({ contractId, statut: "PREVU" });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          Paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter un paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-montant">Montant</Label>
            <Input id="cp-montant" type="number" step="0.01" {...register("montant")} />
            {errors.montant && <p className="text-sm text-destructive">{errors.montant.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-date">Date de paiement</Label>
            <Input id="cp-date" type="date" {...register("datePaiement")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-reference">Référence</Label>
            <Input id="cp-reference" {...register("reference")} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
