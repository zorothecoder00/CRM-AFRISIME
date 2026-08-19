import { prisma } from "@/lib/prisma";
import { ConversationalAssistantBar } from "@/components/assistant/conversational-assistant-bar";

// Voice & Conversational Interface (cahier des charges V3.0 §41) — voir
// src/lib/conversational-assistant.ts pour la portée exacte (analyse
// d'intention déterministe, pas de LLM) et
// src/components/assistant/conversational-assistant-bar.tsx pour l'usage
// de l'API navigateur SpeechRecognition.
export default async function AssistantPage() {
  const projects = await prisma.project.findMany({
    where: { statut: { in: ["PLANIFIE", "EN_COURS"] } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assistant conversationnel</h1>
        <p className="text-sm text-muted-foreground">
          Posez une question ou dictez une commande — ex. « Quels sont mes rendez-vous demain ? », « Montre-moi les
          projets critiques », « Crée une tâche pour Jean concernant le rapport trimestriel ». Les actions sensibles
          demandent toujours une confirmation.
        </p>
      </div>
      <ConversationalAssistantBar projects={projects.map((p) => ({ id: p.id, label: p.nom }))} />
    </div>
  );
}
