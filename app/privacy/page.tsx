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
      <InfoCallout title="お問い合わせ・ベータ版へのご意見">
        <p>送信ボタンを押すと、フォームに記入したお名前（ニックネーム可）・返信先メールアドレス・件名・本文を、運営者の共通お問い合わせサービス（CONTACT HUB）へ送信・保存します。内容の確認と返信、不正送信の防止に利用し、通知にはメール配信サービスを使用します。</p>
        <p>端末に保存された成績・プロフィール・相談メモ・添付ファイル等を自動で送信することはありません。お問い合わせ本文には、対応に必要のない個人情報や成績を記入しないでください。</p>
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
