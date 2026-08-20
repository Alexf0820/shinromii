const ADMIN_PREVIEW_QUERY_PARAM = "adminKey";

export function buildAdminPath(pathname: string, adminKey?: string | null) {
  if (!adminKey) return pathname;

  const params = new URLSearchParams({ [ADMIN_PREVIEW_QUERY_PARAM]: adminKey });
  return `${pathname}?${params.toString()}`;
}
