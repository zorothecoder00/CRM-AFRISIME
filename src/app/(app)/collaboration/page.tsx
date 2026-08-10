import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function CollaborationPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="items-center text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
        <CardTitle>Module Collaboration à venir</CardTitle>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        Messagerie interne, mentions, réactions et gestion documentaire
        arriveront dans une prochaine version d&apos;AfriFlow. Les réunions
        sont déjà disponibles dans le menu.
      </CardContent>
    </Card>
  );
}
