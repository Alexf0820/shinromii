import { InfoArticle } from "@/components/InfoArticle";
import { InfoCallout, InfoStepList } from "@/components/InfoBlocks";

export default function GuidePage() {
  return (
    <InfoArticle>
      <p>SHINROMiiは、次のような流れで使えます。</p>
      <InfoStepList
        items={[
          {
            icon: "person",
            title: "今の情報を登録",
            text: "今の自分について、分かる範囲だけ登録します。",
          },
          {
            icon: "grades-fill",
            title: "成績・資格を記録",
            text: "評定や資格・検定を、あとから見返せるように残します。",
          },
          {
            icon: "university-fill",
            title: "気になる大学を追加",
            text: "気になる大学・学部を追加して、候補を整理します。",
          },
          {
            icon: "campus",
            title: "オープンキャンパスを記録",
            text: "予定や参加後の感想を残して、見学の記録をまとめます。",
          },
          {
            icon: "ai-fill",
            title: "AIへの相談内容を記録",
            text: "AIに相談した内容をメモして、あとから見返せるようにします。",
          },
          {
            icon: "download",
            title: "ときどきバックアップ",
            text: "大切なデータは、ときどきファイルとして保存しておきましょう。",
          },
        ]}
      />
      <InfoCallout icon="bulb" title="少しずつで大丈夫です">
        <p>
          全部を一度にやらなくても大丈夫です。できるところから、少しずつ進めていきましょう。
        </p>
      </InfoCallout>
      <p>
        機種変更や別の端末で使うときのために、ホームの「大切なデータをバックアップ」から、いまの内容をファイルとして保存できます。バックアップファイルは、自分で大切に保管してください。
      </p>
    </InfoArticle>
  );
}
