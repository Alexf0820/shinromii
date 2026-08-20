"use client";

import { useRouter } from "next/navigation";
import { buildAdminPath } from "@/lib/admin-paths";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { FirstSetup } from "@/components/FirstSetup";

export function AdminSetupPreview() {
  const router = useRouter();

  return (
    <>
      <AdminPreviewBar />
      <FirstSetup preview onFinished={() => router.push(buildAdminPath("/admin"))} />
    </>
  );
}
