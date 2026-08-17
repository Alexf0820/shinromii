import { InfoArticle } from "@/components/InfoArticle";
import { InfoCallout, InfoCheckList, InfoFeatureGrid } from "@/components/InfoBlocks";

export default function AboutPage() {
  return (
    <InfoArticle>
      <div className="info-intro">
        <p className="info-lead">
          進路情報を、
          <br />
          ひとつにまとめる
          <br />
          わたしのノート。
        </p>
        <div className="info-intro-copy">
          <p>
            SHINROMiiは、高校生本人と家族が、進路についての情報をまとめて整理するためのサービスです。
          </p>
          <p>進路情報をあちこちに散らさず、あとから振り返れる自分の進路ノートとして使えます。</p>
        </div>
      </div>
      <InfoCheckList
        items={[
          "成績・評定の記録",
          "資格・検定の整理",
          "気になる大学・学部の整理",
          "オープンキャンパスの記録",
          "AIに相談した内容の保存",
        ]}
      />
      <InfoCallout title="この端末の中に保存されます">
        <p>
          現在のSHINROMiiでは、入力した進路情報はこの端末の中に保存されます。成績・大学候補・オープンキャンパス・プロフィールなどの進路情報を、SHINROMiiのサーバーへ保存する仕組みではありません。
        </p>
      </InfoCallout>
      <h2>SHINROMiiの特徴</h2>
      <InfoFeatureGrid
        items={[
          {
            icon: "spark",
            title: "シンプルで使いやすい",
            text: "必要なことだけを、わかりやすくまとめられます。",
          },
          {
            icon: "star",
            title: "自分のペースで続けられる",
            text: "全部を一度に入力しなくても、少しずつ進められます。",
          },
          {
            icon: "university-fill",
            title: "高校生活の進路整理をサポート",
            text: "成績から大学候補まで、進路の記録をひとつに残せます。",
          },
        ]}
      />
    </InfoArticle>
  );
}
