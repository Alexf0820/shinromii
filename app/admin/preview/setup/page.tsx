import { AdminSetupPreview } from "@/app/admin/preview/setup/AdminSetupPreview";
import { requireAdminPreviewAccess } from "@/lib/admin-access-server";

type AdminSetupPreviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSetupPreviewPage({ searchParams }: AdminSetupPreviewPageProps) {
  const { adminKey } = await requireAdminPreviewAccess(searchParams);

  return <AdminSetupPreview adminKey={adminKey} />;
}
