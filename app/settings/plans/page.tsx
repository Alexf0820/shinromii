import Link from "next/link";
import { PlanComparisonTable } from "@/components/settings/PlanComparisonTable";

export default function SettingsPlansPage() {
  return (
    <div className="page-stack compact settings-stack">
      <PlanComparisonTable />
      <section className="panel settings-cloud-card">
        <p className="settings-cloud-eyebrow">Cloud版のご案内</p>
        <p className="settings-cloud-title">Cloud版でできるようにしたいこと（予定）</p>
        <p className="settings-cloud-text">
          家族との共有、別の端末からの利用、自動バックアップをまとめて使えるように準備しています。
        </p>
        <Link href="/settings/account" className="action-button primary">
          Cloud版の流れを見る
        </Link>
      </section>
    </div>
  );
}
