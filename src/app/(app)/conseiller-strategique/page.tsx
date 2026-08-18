import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { buildStrategicAdvisorAnswers } from "@/lib/strategic-advisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircleQuestion } from "lucide-react";

// Conseiller stratégique IA (cahier des charges V3.0 §9). Sans clé LLM
// disponible, les 5 questions listées par le cahier sont répondues par des
// heuristiques sur les données réelles (voir src/lib/strategic-advisor.ts),
// pas par un vrai échange en langage naturel — présenté comme tel ci-dessous.
export default async function StrategicAdvisorPage() {
  const session = await getServerSession(authOptions);
  if (!session!.user.permissions.includes(PERMISSIONS.PLAN_READ)) {
    redirect("/dashboard");
  }

  const answers = await buildStrategicAdvisorAnswers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conseiller stratégique</h1>
        <p className="text-sm text-muted-foreground">
          Réponses calculées à partir des données actuelles de l&apos;organisation — pas un assistant conversationnel
          libre (aucune clé de modèle de langage configurée).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {answers.map((a) => (
          <Card key={a.question}>
            <CardHeader className="flex flex-row items-start gap-2">
              <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">{a.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{a.reponse}</p>
              {a.details.length > 1 && (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {a.details.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
