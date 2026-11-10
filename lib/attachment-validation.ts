export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const extensions = new Map<string, string>([["pdf", "application/pdf"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"]]);

/** Both new uploads and old IndexedDB blobs must pass this before creating an object URL. */
export async function validateAttachmentBlob(blob: Blob, name: string): Promise<Blob> {
  const expected = extensions.get(name.split(".").pop()?.toLowerCase() ?? "");
  if (!expected || blob.size === 0 || blob.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("添付は20MB以下の PDF / JPG / PNG / WebP にしてください。");
  }
  // Safari/Files sometimes supplies an empty or generic MIME. Never accept an active content MIME.
  if (blob.type && blob.type !== "application/octet-stream" && blob.type.toLowerCase() !== expected) {
    throw new Error("拡張子とファイルの種類が一致しないため、この添付は開けません。");
  }
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const starts = (...signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  const valid = expected === "application/pdf" ? starts(0x25, 0x50, 0x44, 0x46, 0x2d)
    : expected === "image/jpeg" ? starts(0xff, 0xd8, 0xff)
    : expected === "image/png" ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    : starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!valid) throw new Error("ファイルの内容を確認できないため、この添付は開けません。元のPDFや画像を選び直してください。");
  // Only a validated, fixed MIME is used. Backup metadata can never supply this type.
  return blob.type === expected ? blob : new Blob([blob], { type: expected });
}
