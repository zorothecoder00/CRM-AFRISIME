import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ParametresProfilPage() {
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      mfaEnabled: true,
      role: { select: { label: true } },
      department: { select: { name: true } },
    },
  });

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
    </div>
  );
}
