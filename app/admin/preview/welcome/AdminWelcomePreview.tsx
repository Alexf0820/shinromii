"use client";

import { useRouter } from "next/navigation";
import { buildAdminPath } from "@/lib/admin-paths";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { WelcomeStart } from "@/components/WelcomeStart";

export function AdminWelcomePreview() {
  const router = useRouter();

  return (
    <>
      <AdminPreviewBar />
      <WelcomeStart
        preview
        onStartFresh={() => router.push(buildAdminPath("/admin/preview/setup"))}
        onRestored={() => router.push(buildAdminPath("/admin"))}
      />
    </>
  );
}
