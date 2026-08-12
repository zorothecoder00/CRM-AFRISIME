import { Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Avatar de messagerie : photo si disponible, sinon initiales sur fond degrade (icone groupe pour une conversation de groupe). */
export function UserAvatar({
  name,
  image,
  isGroup,
  size = "default",
  className,
}: {
  name: string;
  image?: string | null;
  isGroup?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {image && <AvatarImage src={image} alt={name} />}
      <AvatarFallback className="bg-gradient-to-br from-primary to-info font-semibold text-primary-foreground">
        {isGroup ? <Users className="h-4 w-4" /> : initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
