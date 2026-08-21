import { DataProtectionGuide } from "@/components/settings/DataProtectionGuide";

export default function DataProtectionPage() {
  return (
    <div className="page-stack compact settings-stack">
      <DataProtectionGuide detailed />
      <div className="settings-soft-note">
        <p>
          Cloud版では、情報をそのまま読めない形にして保存する仕組みを予定しています。内容は、わかりやすい言葉でこれからもご案内します。
        </p>
      </div>
    </div>
  );
}
