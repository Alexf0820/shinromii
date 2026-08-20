import { AdminClient } from "@/app/admin/AdminClient";
import { requireAdminPreviewAccess } from "@/lib/admin-access-server";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { adminKey } = await requireAdminPreviewAccess(searchParams);

  return <AdminClient adminKey={adminKey} />;
}
