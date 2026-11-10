/** Only explicit HTTP(S) links are navigable. Preserve stored text; never invent a destination. */
export function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    const url = new URL(trimmed);
    return ["https:", "http:"].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
