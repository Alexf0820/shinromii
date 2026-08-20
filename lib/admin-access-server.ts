import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_PREVIEW_QUERY_PARAM = "adminKey";

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput =
  | Promise<Record<string, SearchParamValue> | undefined>
  | Record<string, SearchParamValue>
  | undefined;

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function isPrivateIpv4Host(hostname: string) {
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;

  const match = hostname.match(/^172\.(\d{1,3})\./);
  if (!match) return false;

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function isLocalAdminHost(host: string | null) {
  if (!host) return false;

  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    isPrivateIpv4Host(hostname)
  );
}

async function resolveSearchParams(searchParams: SearchParamsInput) {
  return (await searchParams) ?? {};
}

export async function requireAdminPreviewAccess(searchParams?: SearchParamsInput) {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (isLocalAdminHost(host)) {
    return { adminKey: null };
  }

  const previewSecret = process.env.SHINROMII_ADMIN_PREVIEW_KEY?.trim();
  if (!previewSecret) {
    redirect("/");
  }

  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const providedKey = firstValue(resolvedSearchParams[ADMIN_PREVIEW_QUERY_PARAM]);

  if (providedKey === previewSecret) {
    return { adminKey: previewSecret };
  }

  redirect("/");
}
