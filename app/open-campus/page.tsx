import { SectionHeader } from "@/components/SectionHeader";
import { campusDone, campusUpcoming } from "@/data/mockData";

export default function OpenCampusPage() {
  return (
    <div className="page-stack">
      <SectionHeader
        title="オープンキャンパス"
        description="これから行く予定と参加済みを分けて確認"
      />

      <section className="panel">
        <SectionHeader
          title="これから行く予定"
          description="予約状況が見やすいカード表示"
        />
        <div className="list-stack">
          {campusUpcoming.map((item) => (
            <article key={`${item.university}-${item.date}`} className="list-card">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="item-title">{item.university}</p>
                  <p className="item-subtitle">{item.program}</p>
                </div>
                <span
                  className={`status-pill ${
                    item.status === "予約済み" ? "reserved" : "considering"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="detail-line">{item.date}</p>
              <p className="muted-text">{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          title="参加済み"
          description="感想や良かった点を残す想定の見せ方"
        />
        <div className="list-stack">
          {campusDone.map((item) => (
            <article key={`${item.university}-${item.date}`} className="candidate-card">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="item-title">{item.university}</p>
                  <p className="item-subtitle">{item.program}</p>
                </div>
                <span className="status-pill done">★ {item.rating}</span>
              </div>
              <p className="detail-line">{item.date}</p>
              <div className="feedback-grid">
                <div className="feedback-card">
                  <p className="feedback-label">良かったところ</p>
                  <p>{item.good}</p>
                </div>
                <div className="feedback-card">
                  <p className="feedback-label">微妙だったところ</p>
                  <p>{item.bad}</p>
                </div>
              </div>
              <div className="note-card">
                <p className="feedback-label">本人の感想</p>
                <p>{item.comment}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
