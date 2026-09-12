import { InfoArticle } from "@/components/InfoArticle";
import { InfoCallout, InfoPointList } from "@/components/InfoBlocks";

export default function PrivacyPage() {
  return (
    <InfoArticle>
      <InfoCallout title="入力した進路情報は、現在この端末内に保存されます">
        <p>
          成績・大学候補・オープンキャンパス・プロフィールなどの進路情報を、SHINROMiiのサーバーへ保存する仕組みではありません。
        </p>
      </InfoCallout>
      <InfoCallout title="ベータ版へのご意見・ご要望">
        <p>送信ボタンを押すと、記入した本文・アプリのバージョン・送信日時・ページ・大まかな端末とブラウザの種別を、メール配信サービスを通じて運営者へ送信します。端末に保存された成績やプロフィール等は送信しません。本文には個人情報を記入しないでください。</p>
      </InfoCallout>
      <InfoPointList
        items={[
          {
            icon: "lock",
            title: "入力した進路情報について",
            text: "現在のSHINROMiiでは、入力した進路情報はこの端末の中に保存されます。",
          },
          {
            icon: "download",
            title: "バックアップについて",
            text: "バックアップデータは、自分の端末に保存されます。SHINROMiiのサーバーには保存されないので、なくさないようご自身で管理してください。",
          },
          {
            icon: "person",
            title: "本名の登録について",
            text: "SHINROMiiでは、本名の登録を求めません。",
          },
          {
            icon: "university",
            title: "学校名について",
            text: "学校名の登録も求めません。",
          },
          {
            icon: "edit",
            title: "表示名について",
            text: "表示名は任意で、通常の画面には出しません。",
          },
        ]}
      />
    </InfoArticle>
  );
}
