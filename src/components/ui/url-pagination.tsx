"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

/** Pagination server-driven generique : synchronise la page courante avec
 * `?page=` dans l'URL (Pagination elle-meme est purement controlee, sans
 * notion d'URL). Reutilisable par toute liste server-side paginee. */
export function UrlPagination({
  page,
  totalPages,
  paramName = "page",
  className,
}: {
  page: number;
  totalPages: number;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePageChange(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(next));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} className={className} />;
}
