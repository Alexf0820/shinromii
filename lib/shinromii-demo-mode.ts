import { createDemoSample } from "@/lib/shinromii-demo-sample";

const MODE_KEY = "SHINROMII::demo-mode::v1";
export const DEMO_STORAGE_KEY = "SHINROMII::storage::v1::demo";
let documentMode: boolean | undefined;

/** タブごとに選択。切替直後の古い非同期処理は元の保存領域を使い続ける。 */
export function isDemoMode() {
  if (typeof window === "undefined") return false;
  return documentMode ??= window.sessionStorage.getItem(MODE_KEY) === "demo";
}

export function scopedStorageKey(normalKey: string) {
  return isDemoMode() ? `${normalKey}::demo` : normalKey;
}

/** 保存領域は移動・コピーしない。選択変更後は必ず新しいdocumentへ移る。 */
export function switchDemoMode(enabled: boolean) {
  if (enabled && window.localStorage.getItem(DEMO_STORAGE_KEY) === null) {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(createDemoSample()));
  }
  window.sessionStorage.setItem(MODE_KEY, enabled ? "demo" : "normal");
  window.location.replace("/");
}
