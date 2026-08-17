"use client";

import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Option = { id: string; label: string };

const ADMIN_REQUEST_TYPE_OPTIONS = [
  { value: "ACHAT", label: "Achat" },
  { value: "MISSION", label: "Mission" },
  { value: "DECAISSEMENT", label: "Décaissement" },
  { value: "MATERIEL", label: "Matériel" },
  { value: "AUTORISATION", label: "Autorisation" },
  { value: "RECRUTEMENT", label: "Recrutement" },
  { value: "AUTRE", label: "Autre" },
];

const RISK_PROBABILITE_OPTIONS = [
  { value: "FAIBLE", label: "Faible" },
  { value: "MOYENNE", label: "Moyenne" },
  { value: "ELEVEE", label: "Élevée" },
];

const RISK_IMPACT_OPTIONS = [
  { value: "FAIBLE", label: "Faible" },
  { value: "MOYEN", label: "Moyen" },
  { value: "ELEVE", label: "Élevé" },
];

const REPORT_TYPE_OPTIONS = [
  { value: "PROJETS", label: "Rapport des projets" },
  { value: "PROGRAMMES", label: "Rapport des programmes" },
  { value: "TACHES", label: "Rapport des tâches" },
  { value: "CHARGE_TRAVAIL", label: "Rapport de charge de travail" },
  { value: "OBJECTIFS", label: "Rapport des objectifs & KPI" },
  { value: "PRODUCTIVITE", label: "Rapport de productivité" },
  { value: "ACTIVITE", label: "Rapport d'activité" },
  { value: "PERFORMANCE", label: "Rapport de performance" },
  { value: "HEURES_PASSEES", label: "Rapport d'heures passées" },
];

/**
 * Champs de configuration propres à l'action choisie (V2.2 §7.3/§8),
 * partagés entre RuleFormDialog (règle indépendante) et le formulaire
 * d'étape d'OrchestrationPlaybook — d'où `namePrefix` pour composer les noms
 * de champ react-hook-form (ex. "" ou "steps.0."). Types de register/
 * setValue volontairement larges (any) : réutilisé par deux schémas de
 * formulaire distincts (CreateRuleInput et l'éditeur de playbook).
 */
export function AutomationActionFields({
  action,
  namePrefix = "",
  register,
  setValue,
  users,
  existingRules,
}: {
  action: string;
  namePrefix?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  users: Option[];
  existingRules?: Option[];
}) {
  const name = (field: string) => `${namePrefix}${field}` as const;

  if (action === "CREATE_NEXT_TASK") {
    return (
      <div className="space-y-4 rounded-md border p-3">
        <div className="space-y-2">
          <Label>Titre de la tâche à créer</Label>
          <Input {...register(name("nextTaskTitre"))} />
        </div>
        <div className="space-y-2">
          <Label>Responsable</Label>
          <Select onValueChange={(v) => setValue(name("nextTaskResponsableId"), v)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Échéance (jours après création)</Label>
          <Input type="number" {...register(name("nextTaskDelaiJours"))} />
        </div>
      </div>
    );
  }

  if (action === "SEND_REMINDER") {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Label>Jours avant échéance (si le déclencheur est « échéance approche »)</Label>
        <Input type="number" defaultValue={3} {...register(name("reminderDelaiJours"))} />
      </div>
    );
  }

  if (action === "ASSIGN_USER") {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Label>Utilisateur à assigner</Label>
        <Select onValueChange={(v) => setValue(name("assignUserId"), v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (action === "CHANGE_STATUS") {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Label>Valeur du statut cible (ex. EN_COURS, TERMINEE, PRET_POUR_EXECUTION)</Label>
        <Input placeholder="Ex. EN_COURS" {...register(name("changeStatusValue"))} />
      </div>
    );
  }

  if (action === "CREATE_MEETING") {
    return (
      <div className="space-y-4 rounded-md border p-3">
        <div className="space-y-2">
          <Label>Titre de la réunion</Label>
          <Input {...register(name("meetingTitre"))} />
        </div>
        <div className="space-y-2">
          <Label>Dans (jours après déclenchement)</Label>
          <Input type="number" defaultValue={3} {...register(name("meetingDelaiJours"))} />
        </div>
      </div>
    );
  }

  if (action === "CREATE_ADMIN_REQUEST") {
    return (
      <div className="space-y-4 rounded-md border p-3">
        <div className="space-y-2">
          <Label>Type de demande</Label>
          <Select onValueChange={(v) => setValue(name("adminRequestType"), v)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_REQUEST_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Titre de la demande</Label>
          <Input {...register(name("adminRequestTitre"))} />
        </div>
      </div>
    );
  }

  if (action === "CREATE_RISK") {
    return (
      <div className="space-y-4 rounded-md border p-3">
        <div className="space-y-2">
          <Label>Titre du risque</Label>
          <Input {...register(name("riskTitre"))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Probabilité</Label>
            <Select onValueChange={(v) => setValue(name("riskProbabilite"), v)}>
              <SelectTrigger>
                <SelectValue placeholder="Moyenne" />
              </SelectTrigger>
              <SelectContent>
                {RISK_PROBABILITE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Impact</Label>
            <Select onValueChange={(v) => setValue(name("riskImpact"), v)}>
              <SelectTrigger>
                <SelectValue placeholder="Moyen" />
              </SelectTrigger>
              <SelectContent>
                {RISK_IMPACT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  if (action === "GENERATE_REPORT") {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Label>Type de rapport</Label>
        <Select onValueChange={(v) => setValue(name("reportType"), v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (action === "TRIGGER_WORKFLOW") {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Label>Règle à déclencher</Label>
        <Select onValueChange={(v) => setValue(name("targetRuleId"), v)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {(existingRules ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}
