"use client";

import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

export function SettingsLink() {
  return (
    <Link href="/settings" className="home-bell" aria-label="設定">
      <UiIcon name="settings" className="home-bell-icon" />
    </Link>
  );
}
