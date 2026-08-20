import { AdminWelcomePreview } from "@/app/admin/preview/welcome/AdminWelcomePreview";
import { requireAdminPreviewAccess } from "@/lib/admin-access-server";

type AdminWelcomePreviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminWelcomePreviewPage({ searchParams }: AdminWelcomePreviewPageProps) {
  await requireAdminPreviewAccess("/admin/preview/welcome", searchParams);

  return <AdminWelcomePreview />;
}
