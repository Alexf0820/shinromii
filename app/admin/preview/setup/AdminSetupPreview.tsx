"use client";

import { useRouter } from "next/navigation";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { FirstSetup } from "@/components/FirstSetup";

export function AdminSetupPreview() {
  const router = useRouter();

  return (
    <>
      <AdminPreviewBar />
      <FirstSetup preview onFinished={() => router.push("/admin")} />
    </>
  );
}
