"use client";

import { useRouter } from "next/navigation";
import { buildAdminPath } from "@/lib/admin-paths";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { WelcomeStart } from "@/components/WelcomeStart";

type AdminWelcomePreviewProps = {
  adminKey?: string | null;
};

export function AdminWelcomePreview({ adminKey = null }: AdminWelcomePreviewProps) {
  const router = useRouter();

  return (
    <>
      <AdminPreviewBar adminKey={adminKey} />
      <WelcomeStart
        preview
        onStartFresh={() => router.push(buildAdminPath("/admin/preview/setup", adminKey))}
        onRestored={() => router.push(buildAdminPath("/admin", adminKey))}
      />
    </>
  );
}
