import { SectionHeader } from "@/components/SectionHeader";
import { gradeSummary, qualifications, termGrades } from "@/data/mockData";

export default function GradesPage() {
  return (
    <div className="page-stack">
      <SectionHeader
        title="成績・評定"
        description="学年や学期ごとの評定を見やすく整理するための画面ベース"
      />

      <section className="card-grid two-up">
        {gradeSummary.map((item) => (
          <article key={item.label} className="metric-card">
            <p className="metric-label">{item.label}</p>
            <p className="metric-value">{item.value}</p>
            <p className="muted-text">{item.note}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <SectionHeader
          title="学期ごとの記録"
          description="将来的には編集・追加機能を載せる想定"
        />
        <div className="list-stack">
          {termGrades.map((term) => (
            <article key={term.term} className="list-card">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="item-title">{term.term}</p>
                  <p className="item-subtitle">{term.average}</p>
                </div>
                <span className="soft-pill">{term.focus}</span>
              </div>
              <div className="subject-grid">
                {term.subjects.map((subject) => (
                  <div key={subject.name} className="subject-chip">
                    <span>{subject.name}</span>
                    <strong>{subject.score}</strong>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          title="資格・検定"
          description="英検などの蓄積イメージ"
        />
        <div className="list-stack">
          {qualifications.map((item) => (
            <article key={item.name} className="list-card">
              <div className="row-between gap-sm">
                <div>
                  <p className="item-title small">{item.name}</p>
                  <p className="muted-text">{item.date}</p>
                </div>
                <span className="status-pill review">{item.level}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
