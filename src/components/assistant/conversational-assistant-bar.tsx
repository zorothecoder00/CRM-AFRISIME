"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { askAssistant, type AskAssistantResult } from "@/actions/assistant.actions";
import { createTask } from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Send } from "lucide-react";
import Link from "next/link";

// Voice & Conversational Interface (cahier des charges V3.0 §41) — la
// dictée vocale s'appuie sur l'API navigateur SpeechRecognition (Web Speech
// API : Chrome/Edge desktop et mobile, aucune clé requise). Non supportée
// partout (ex. Firefox) : le champ texte reste toujours disponible en repli,
// jamais une dépendance dure. Voir src/lib/conversational-assistant.ts pour
// l'analyse d'intention et la justification de sa portée.

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { transcript: string }[][] } & { [index: number]: { [index: number]: { transcript: string } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition as new () => SpeechRecognitionLike) ?? (w.webkitSpeechRecognition as new () => SpeechRecognitionLike) ?? null;
}

export function ConversationalAssistantBar({ projects }: { projects: { id: string; label: string }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<AskAssistantResult | null>(null);
  const [projectId, setProjectId] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const askAction = useAction(askAssistant);
  const createTaskAction = useAction(createTask, { successMessage: "Tâche créée." });

  // `getSpeechRecognition()` depend de `window` : evalue directement dans le
  // corps du composant, il renvoie false au rendu serveur puis true des le
  // premier rendu client (le navigateur a bien `window`), ce qui desaccorde
  // le HTML hydrate de celui rendu par le serveur (erreur d'hydratation).
  // useState+useEffect force le premier rendu client a rester identique au
  // rendu serveur (false), le bouton micro n'apparaissant qu'apres coup.
  const [speechSupported, setSpeechSupported] = useState(false);
  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() !== null);
  }, []);

  function toggleListening() {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event[0]?.[0]?.transcript ?? "";
      setText(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setProjectId("");
    const res = await askAction.run({ text: text.trim() });
    if (res.ok) setResult(res.data);
  }

  async function handleConfirmCreateTask() {
    if (result?.kind !== "PROPOSAL" || !result.responsableId || !projectId) return;
    const res = await createTaskAction.run({
      projectId,
      titre: result.titre,
      priorite: "MOYENNE",
      responsablePrincipalId: result.responsableId,
      assigneeIds: [],
      competenceIds: [],
    });
    if (res.ok) {
      setResult(null);
      setText("");
      router.push(`/taches/${res.data.id}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assistant conversationnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder='Ex. "Quels sont mes rendez-vous demain ?"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {speechSupported && (
            <Button type="button" variant={listening ? "destructive" : "outline"} size="icon" onClick={toggleListening}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={!text.trim() || askAction.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {result?.kind === "ANSWER" && (
          <div className="space-y-1.5 rounded-md border p-3 text-sm">
            <p>{result.answer.message}</p>
            {result.answer.items.map((item, i) => (
              <div key={i}>
                {item.href ? (
                  <Link href={item.href} className="underline">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
                {item.sublabel && <span className="text-xs text-muted-foreground"> — {item.sublabel}</span>}
              </div>
            ))}
          </div>
        )}

        {result?.kind === "PROPOSAL" && (
          <div className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3">
            <p className="text-sm">
              Créer la tâche « {result.titre} » pour{" "}
              {result.responsableId ? result.responsableNom : `${result.responsableNom} (aucun utilisateur trouvé)`} — action
              sensible, confirmation requise.
            </p>
            {result.responsableId && (
              <div className="space-y-1.5">
                <Label className="text-xs">Projet (requis)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirmCreateTask}
                disabled={!result.responsableId || !projectId || createTaskAction.isPending}
              >
                Confirmer la création
              </Button>
              <Button size="sm" variant="outline" onClick={() => setResult(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
