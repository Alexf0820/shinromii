import { AdminWelcomePreview } from "@/app/admin/preview/welcome/AdminWelcomePreview";
import { requireAdminPreviewAccess } from "@/lib/admin-access-server";

type AdminWelcomePreviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminWelcomePreviewPage({ searchParams }: AdminWelcomePreviewPageProps) {
  const { adminKey } = await requireAdminPreviewAccess(searchParams);

  return <AdminWelcomePreview adminKey={adminKey} />;
}
