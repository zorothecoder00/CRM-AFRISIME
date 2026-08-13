import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";
import { UserCompetencesManager } from "@/components/profile/user-competences-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParametresProfilPage() {
  const session = await getServerSession(authOptions);

  const [user, competences, catalogue] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session!.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        mfaEnabled: true,
        role: { select: { label: true } },
        department: { select: { name: true } },
      },
    }),
    prisma.userCompetence.findMany({
      where: { userId: session!.user.id },
      include: { competence: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.competence.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mon profil</h1>
        <p className="text-sm text-muted-foreground">
          Consultez et modifiez vos informations personnelles.
        </p>
      </div>

      <ProfileForm
        initialName={user.name}
        initialEmail={user.email}
        initialImage={user.image}
        roleLabel={user.role.label}
        departmentName={user.department?.name ?? null}
        mfaEnabled={user.mfaEnabled}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes compétences</CardTitle>
        </CardHeader>
        <CardContent>
          <UserCompetencesManager
            competences={competences.map((c) => ({
              competenceId: c.competenceId,
              nom: c.competence.nom,
              niveau: c.niveau,
            }))}
            catalogue={catalogue.map((c) => ({ id: c.id, label: c.nom }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
