export const ADMIN_PREVIEW_QUERY_PARAM = "adminKey";
export const ADMIN_PREVIEW_ACCESS_COOKIE = "shinromii_admin_preview";

export function buildAdminAuthorizationPath(pathname: string, adminKey: string) {
  const params = new URLSearchParams({
    [ADMIN_PREVIEW_QUERY_PARAM]: adminKey,
    redirectTo: pathname,
  });

  return `/admin/access?${params.toString()}`;
}

export function buildAdminPath(pathname: string) {
  return pathname;
}
