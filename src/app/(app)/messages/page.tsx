import { MessageSquare } from "lucide-react";

export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
      <MessageSquare className="h-10 w-10 opacity-30" />
      <p className="text-sm">Sélectionnez une conversation pour l&apos;ouvrir.</p>
    </div>
  );
}
