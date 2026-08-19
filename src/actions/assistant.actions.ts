"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseIntent, answerReadIntent, resolveUserByName, type AssistantResponse } from "@/lib/conversational-assistant";

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Non authentifié");
  return session;
}

export type AskAssistantResult =
  | { kind: "ANSWER"; answer: AssistantResponse }
  | { kind: "PROPOSAL"; responsableNom: string; responsableId: string | null; titre: string };

/** Voice & Conversational Interface (cahier des charges V3.0 §41) — point d'entrée unique, lecture directe ou proposition à confirmer. */
export async function askAssistant(input: { text: string }): Promise<AskAssistantResult> {
  const session = await requireSession();
  const intent = parseIntent(input.text);

  if (intent.type === "CREER_TACHE_PROPOSAL") {
    const responsable = await resolveUserByName(intent.responsableNom);
    return {
      kind: "PROPOSAL",
      responsableNom: intent.responsableNom,
      responsableId: responsable?.id ?? null,
      titre: intent.titre,
    };
  }

  const answer = await answerReadIntent(intent, session.user.id, session.user.permissions);
  return { kind: "ANSWER", answer };
}
