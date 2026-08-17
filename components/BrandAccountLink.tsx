import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

export function BrandAccountLink() {
  return (
    <Link href="/profile" className="home-bell" aria-label="マイ情報">
      <UiIcon name="person" className="home-bell-icon" />
    </Link>
  );
}
