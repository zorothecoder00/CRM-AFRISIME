"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonalPlanningEntryFormDialog } from "@/components/personal-planning/entry-form-dialog";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { QuickCaptureButton } from "@/components/personal-planning/quick-capture-button";
import { RequestAvailabilityDialog } from "@/components/personal-planning/request-availability-dialog";
import { ReorganizeDialog } from "@/components/personal-planning/personal-planning-today";
import type { PersonalPlanningReferenceData } from "@/components/personal-planning/entry-fields";
import { Sparkles } from "lucide-react";

type Option = { id: string; label: string };

/**
 * Barre d'outils commune à TOUT le module Planning personnel (prototype V2) —
 * dans le prototype, ces 5 boutons vivent au-dessus du contenu de la page
 * active, pas dans chaque page : rendue une seule fois par le layout, elle
 * apparaît donc automatiquement sur chaque sous-page.
 */
export function PersonalPlanningToolbar({
  refData,
  meetingProjects,
  colleagues,
  canCreateMeeting,
  todayKey,
}: {
  refData: PersonalPlanningReferenceData;
  meetingProjects: Option[];
  colleagues: Option[];
  canCreateMeeting: boolean;
  todayKey: string;
}) {
  const [reorganizeOpen, setReorganizeOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <RequestAvailabilityDialog colleagues={colleagues} />
      {canCreateMeeting && (
        <MeetingFormDialog projects={meetingProjects} users={colleagues} />
      )}
      <PersonalPlanningEntryFormDialog refData={refData} />
      <QuickCaptureButton />
      <Button
        variant="outline"
        size="sm"
        className="border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary hover:from-primary/15 hover:to-violet-500/15"
        onClick={() => setReorganizeOpen(true)}
      >
        <Sparkles className="mr-1 h-4 w-4" />
        Générer / optimiser mon planning
      </Button>

      {/* Réutilise le même dialogue que le bloc Surcharge du hub (reorganizeOverloadedDay) —
          réaffectation/réunion désactivées ici (pas de contexte de réunion/collègue déjà chargé
          à ce niveau), les 3 vraies stratégies (reporter/étaler/réduire) restent pleinement actives. */}
      <ReorganizeDialog
        open={reorganizeOpen}
        onOpenChange={setReorganizeOpen}
        todayKey={todayKey}
        todayMeetingHref={null}
        canReassign={false}
        onReassign={() => {}}
      />
    </div>
  );
}
