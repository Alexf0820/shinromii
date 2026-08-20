import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_PREVIEW_ACCESS_COOKIE, ADMIN_PREVIEW_QUERY_PARAM, buildAdminAuthorizationPath } from "@/lib/admin-paths";

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput =
  | Promise<Record<string, SearchParamValue> | undefined>
  | Record<string, SearchParamValue>
  | undefined;

const ACCESS_TTL_MS = 1000 * 60 * 30;

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
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

function getPreviewSecret() {
  return process.env.SHINROMII_ADMIN_PREVIEW_KEY?.trim() ?? "";
}

function signAccessToken(expiresAt: number, previewSecret: string) {
  return createHmac("sha256", previewSecret).update(String(expiresAt)).digest("hex");
}

export function createAdminPreviewAccessCookieValue(previewSecret: string, now = Date.now()) {
  const expiresAt = now + ACCESS_TTL_MS;
  const signature = signAccessToken(expiresAt, previewSecret);
  return `${expiresAt}.${signature}`;
}

function verifyAdminPreviewAccessCookieValue(cookieValue: string | undefined, previewSecret: string, now = Date.now()) {
  if (!cookieValue || !previewSecret) return false;

  const [expiresAtText, signature] = cookieValue.split(".");
  const expiresAt = Number(expiresAtText);

  if (!Number.isFinite(expiresAt) || !signature || expiresAt <= now) {
    return false;
  }

  return safeEqual(signature, signAccessToken(expiresAt, previewSecret));
}

export function isValidAdminPreviewKey(providedKey: string | null | undefined, previewSecret = getPreviewSecret()) {
  if (!providedKey || !previewSecret) {
    return false;
  }

  return safeEqual(providedKey, previewSecret);
}

function isDevelopmentLocalBypassAllowed(host: string | null) {
  return process.env.NODE_ENV !== "production" && isLocalAdminHost(host);
}

export async function requireAdminPreviewAccess(pathname: string, searchParams?: SearchParamsInput) {
  const host = (await headers()).get("host");

  if (isDevelopmentLocalBypassAllowed(host)) {
    return;
  }

  const previewSecret = getPreviewSecret();
  if (!previewSecret) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(ADMIN_PREVIEW_ACCESS_COOKIE)?.value;
  if (verifyAdminPreviewAccessCookieValue(accessCookie, previewSecret)) {
    return;
  }

  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const providedKey = firstValue(resolvedSearchParams[ADMIN_PREVIEW_QUERY_PARAM]);
  if (providedKey && isValidAdminPreviewKey(providedKey, previewSecret)) {
    redirect(buildAdminAuthorizationPath(pathname, providedKey));
  }

  redirect("/");
}
