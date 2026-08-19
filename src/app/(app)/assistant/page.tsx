import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAiRoleFlavor } from "@/lib/conversational-assistant";
import { ConversationalAssistantBar } from "@/components/assistant/conversational-assistant-bar";
import { Badge } from "@/components/ui/badge";

// Voice & Conversational Interface (cahier des charges V3.0 §41), adaptée
// par rôle (V3.0 §52 "Role-Based AI") — voir
// src/lib/conversational-assistant.ts pour la portée exacte (analyse
// d'intention déterministe, pas de LLM) et
// src/components/assistant/conversational-assistant-bar.tsx pour l'usage
// de l'API navigateur SpeechRecognition.
export default async function AssistantPage() {
  const session = await getServerSession(authOptions);
  const flavor = getAiRoleFlavor(session!.user.roleKey);

  const projects = await prisma.project.findMany({
    where: { statut: { in: ["PLANIFIE", "EN_COURS"] } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Assistant conversationnel</h1>
          <Badge variant="info">{flavor.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{flavor.description}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Posez une question ou dictez une commande — ex. « Quels sont mes rendez-vous demain ? », « Montre-moi les
          projets critiques », « Crée une tâche pour Jean concernant le rapport trimestriel ». Les actions sensibles
          demandent toujours une confirmation.
        </p>
        {flavor.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {flavor.suggestions.map((s) => (
              <Link key={s.href} href={s.href} className="text-xs text-primary underline">
                {s.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
      <ConversationalAssistantBar projects={projects.map((p) => ({ id: p.id, label: p.nom }))} />
    </div>
  );
}
