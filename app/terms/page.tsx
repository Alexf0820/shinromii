import { InfoArticle } from "@/components/InfoArticle";

export default function TermsPage() {
  return (
    <InfoArticle>
      <section className="info-terms-block">
        <h2>サービスについて</h2>
        <p>SHINROMiiは、進路についての情報を整理するための補助ツールです。</p>
      </section>
      <section className="info-terms-block">
        <h2>進路情報について</h2>
        <p>
          大学や入試などに関する情報は、あとから変わることがあります。出願や見学など、大切な判断の前には、大学や学校などの公式情報で最終確認してください。
        </p>
      </section>
      <section className="info-terms-block">
        <h2>データについて</h2>
        <p>端末の故障や機種変更などで、保存した内容が見られなくなることがあります。</p>
      </section>
      <section className="info-terms-block">
        <h2>バックアップについて</h2>
        <p>大切なデータは、ときどきバックアップしてください。</p>
      </section>
      <section className="info-terms-block">
        <h2>サービス内容の変更について</h2>
        <p>SHINROMiiはβ版です。サービス内容を変更する場合があります。</p>
      </section>
      <section className="info-terms-block">
        <h2>免責事項</h2>
        <p>SHINROMiiは、進学や合格を保証するものではありません。</p>
      </section>
    </InfoArticle>
  );
}
