"use client";

import { useRouter } from "next/navigation";
import { buildAdminPath } from "@/lib/admin-paths";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { FirstSetup } from "@/components/FirstSetup";

type AdminSetupPreviewProps = {
  adminKey?: string | null;
};

export function AdminSetupPreview({ adminKey = null }: AdminSetupPreviewProps) {
  const router = useRouter();

  return (
    <>
      <AdminPreviewBar adminKey={adminKey} />
      <FirstSetup preview onFinished={() => router.push(buildAdminPath("/admin", adminKey))} />
    </>
  );
}
