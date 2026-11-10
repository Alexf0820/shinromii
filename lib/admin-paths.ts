export const ADMIN_PREVIEW_ACCESS_COOKIE = "shinromii_admin_preview";

export function sanitizeAdminRedirect(value: unknown) {
  if (typeof value !== "string" || !/^\/admin(?:\/|$)/.test(value) || /[\\?#%\u0000-\u0020]/.test(value)) return "/admin";
  const normalized = new URL(value, "https://admin.invalid").pathname;
  return /^\/admin(?:\/|$)/.test(normalized) && !normalized.startsWith("/admin/access") ? normalized : "/admin";
}
export function buildAdminAuthorizationPath(pathname: string) {
  return `/admin/access?${new URLSearchParams({ redirectTo: sanitizeAdminRedirect(pathname) })}`;
}
export function buildAdminPath(pathname: string) { return pathname; }
