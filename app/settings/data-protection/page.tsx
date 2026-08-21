import { DataProtectionGuide } from "@/components/settings/DataProtectionGuide";

export default function DataProtectionPage() {
  return (
    <div className="page-stack compact settings-stack">
      <DataProtectionGuide detailed />
      <div className="settings-soft-note">
        <p>
          Cloud版では、情報をそのまま読めない形にしてから保存する仕組みを予定しています。これからも、わかりやすい言葉で順番にご案内します。
        </p>
      </div>
    </div>
  );
}
