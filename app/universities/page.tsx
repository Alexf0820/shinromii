import { SectionHeader } from "@/components/SectionHeader";
import { universities } from "@/data/mockData";

export default function UniversitiesPage() {
  return (
    <div className="page-stack">
      <SectionHeader
        title="大学・学部候補"
        description="比較しながら、本人と家族の考えを並べて見られるUI"
      />

      <section className="panel">
        <div className="compare-header">
          <span className="soft-pill">比較しやすさ重視</span>
          <p className="muted-text">気になる度、本人評価、家族評価、メモを一覧化</p>
        </div>

        <div className="list-stack">
          {universities.map((item) => (
            <article key={`${item.university}-${item.department}`} className="candidate-card">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="item-title">{item.university}</p>
                  <p className="item-subtitle">
                    {item.faculty} / {item.department}
                  </p>
                </div>
                <span className="rating-badge">★ {item.interest}</span>
              </div>

              <div className="candidate-meta">
                <span className="soft-pill">本人: {item.studentScore}</span>
                <span className="soft-pill">家族: {item.familyScore}</span>
              </div>

              <div className="feedback-grid">
                <div className="feedback-card">
                  <p className="feedback-label">本人メモ</p>
                  <p>{item.studentView}</p>
                </div>
                <div className="feedback-card">
                  <p className="feedback-label">家族メモ</p>
                  <p>{item.familyView}</p>
                </div>
              </div>

              <a className="text-link" href={item.url}>
                大学ページを見る
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
