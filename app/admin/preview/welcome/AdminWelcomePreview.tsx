"use client";

import { useRouter } from "next/navigation";
import { AdminPreviewBar } from "@/components/AdminPreviewBar";
import { WelcomeStart } from "@/components/WelcomeStart";

export function AdminWelcomePreview() {
  const router = useRouter();

  return (
    <>
      <AdminPreviewBar />
      <WelcomeStart
        preview
        onStartFresh={() => router.push("/admin/preview/setup")}
        onRestored={() => router.push("/admin")}
      />
    </>
  );
}
