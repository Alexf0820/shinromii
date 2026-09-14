/** Files stay on the device; no upload or network request is made here. */
export function canShareBackupFile(file: File, nav: Pick<Navigator, "share" | "canShare"> = navigator) {
  try { return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] }); }
  catch { return false; }
}

export function downloadBackupFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  try { link.click(); } finally {
    link.remove();
    // Allow iOS time to hand the file to its preview/download UI.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export async function shareBackupFile(file: File): Promise<"handed-off" | "cancelled"> {
  try {
    // Called directly from the prepared-file button: preserve user activation.
    await navigator.share({ files: [file] });
    return "handed-off";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}
