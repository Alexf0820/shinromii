import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";

type DataProtectionGuideProps = {
  detailed?: boolean;
  showLink?: boolean;
};

const GUIDE_ITEMS = [
  {
    number: "1",
    icon: "lock" as const,
    title: "この端末だけで使う",
    summary: "登録なしで使えます。入力した進路情報は、この端末に保存されます。",
    points: ["登録なしで使えます", "入力した進路情報は、この端末に保存されます"],
    tone: "local",
  },
  {
    number: "2",
    icon: "cloud" as const,
    title: "Cloudで使う",
    summary:
      "進路情報は、そのまま読める形で送らず、安全な形にしてから保存する仕組みを予定しています。",
    points: [
      "そのまま読める形で送らずに保存する仕組みを予定しています",
      "別の端末でも使いやすくする予定です",
    ],
    tone: "cloud",
  },
  {
    number: "3",
    icon: "person-fill" as const,
    title: "家族といっしょに使う",
    summary: "Cloud版では、家族や別の端末から同じ進路情報を確認できるようにします。",
    points: [
      "家族や別の端末から同じ進路情報を確認できるようにします",
      "必要な人だけが見られる形を目指しています",
    ],
    tone: "family",
  },
] as const;

export function DataProtectionGuide({
  detailed = false,
  showLink = false,
}: DataProtectionGuideProps) {
  return (
    <section className={`data-guide ${detailed ? "is-detailed" : "is-compact"}`}>
      <div className="data-guide-head">
        <div>
          <p className="data-guide-kicker">データの守り方</p>
          <h2 className="data-guide-title">あなたの大切な情報を、わかりやすく整理します。</h2>
        </div>
        {showLink ? (
          <Link href="/settings/data-protection" className="data-guide-link">
            くわしく見る
          </Link>
        ) : null}
      </div>

      <div className={`data-guide-list ${detailed ? "is-detailed" : ""}`}>
        {GUIDE_ITEMS.map((item) => (
          <article key={item.number} className={`data-guide-card tone-${item.tone}`}>
            <div className="data-guide-card-head">
              <span className="data-guide-number" aria-hidden="true">
                {item.number}
              </span>
              <span className="data-guide-icon" aria-hidden="true">
                <UiIcon name={item.icon} className="data-guide-glyph" />
              </span>
            </div>
            <h3>{item.title}</h3>
            {detailed ? (
              <ul className="data-guide-points">
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : (
              <p>{item.summary}</p>
            )}
          </article>
        ))}
      </div>

      <div className="data-guide-note">
        <span className="data-guide-note-icon" aria-hidden="true">
          <UiIcon name="heart" className="data-guide-note-glyph" />
        </span>
        <p>
          SHINROMiiは、サービスのために不要な個人情報をできるだけ持たない形を目指しています。
        </p>
      </div>
    </section>
  );
}
