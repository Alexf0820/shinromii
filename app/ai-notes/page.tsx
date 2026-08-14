import { SectionHeader } from "@/components/SectionHeader";
import { aiNotes } from "@/data/mockData";

export default function AiNotesPage() {
  return (
    <div className="page-stack">
      <SectionHeader
        title="AI相談メモ"
        description="外部AIで相談した進路の内容を整理して残すための場所"
      />

      <section className="panel">
        <div className="compare-header">
          <span className="soft-pill">AI連携なし</span>
          <p className="muted-text">今回は保存先UIのベースのみ実装</p>
        </div>

        <div className="list-stack">
          {aiNotes.map((item) => (
            <article key={`${item.ai}-${item.theme}`} className="candidate-card">
              <div className="row-between gap-sm align-start">
                <div>
                  <p className="item-title">{item.theme}</p>
                  <p className="item-subtitle">{item.ai}</p>
                </div>
                <span className="rating-badge">参考度 {item.helpful}</span>
              </div>

              <div className="note-card">
                <p className="feedback-label">おすすめされた大学・学部</p>
                <p>{item.recommendedSchools}</p>
              </div>

              <div className="note-card">
                <p className="feedback-label">おすすめされた職業</p>
                <p>{item.recommendedJobs}</p>
              </div>

              <div className="note-card">
                <p className="feedback-label">回答の要点</p>
                <p>{item.summary}</p>
              </div>

              <a className="text-link" href={item.link}>
                元チャットを見る
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
