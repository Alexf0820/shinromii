// Public introduction only. Never derive this payload from the current URL or notebook.
export const SHINROMII_SHARE = Object.freeze({
  title: "SHINROMii（シンロミー）",
  text: "高校・大学選びの情報をまとめて整理できる進路ノートです。\n気になったら、デモだけでも見てみてください。",
  url: "https://www.shinromii.com",
});

export async function shareShinromii(): Promise<"shared" | "cancelled" | "copy"> {
  try {
    if (!navigator.share || (navigator.canShare && !navigator.canShare(SHINROMII_SHARE))) return "copy";
    await navigator.share({ ...SHINROMII_SHARE });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    return "copy";
  }
}
