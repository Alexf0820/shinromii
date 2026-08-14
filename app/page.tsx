import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import {
  dashboardStats,
  recentItems,
  upcomingCampus,
  universities,
} from "@/data/mockData";

export default function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-card">
        <p className="eyebrow">SHINROMII Ver.0.4</p>
        <h1>進路の情報を、家族とやさしく整理。</h1>
        <p className="hero-copy">
          高校生本人と家族が、成績・大学候補・オープンキャンパス・AI相談メモを
          スマホで見やすく共有するためのUIベースです。
        </p>
      </section>

      <section className="page-stack compact">
        <SectionHeader
          title="進路ダッシュボード"
          description="今日見たい情報をまとめて確認"
        />
        <div className="card-grid two-up">
          {dashboardStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          title="気になる大学"
          description="優先度が高い候補をピックアップ"
        />
        <div className="list-stack">
          {universities.slice(0, 3).map((item) => (
            <article key={`${item.university}-${item.faculty}`} className="list-card">
              <div className="row-between gap-sm">
                <div>
                  <p className="item-title">{item.university}</p>
                  <p className="item-subtitle">
                    {item.faculty} / {item.department}
                  </p>
                </div>
                <span className="rating-badge">★ {item.interest}</span>
              </div>
              <p className="muted-text">{item.studentView}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionHeader
          title="次のオープンキャンパス"
          description="直近の予定をひと目で"
        />
        <article className="highlight-card">
          <div className="row-between gap-sm">
            <div>
              <p className="item-title">{upcomingCampus.university}</p>
              <p className="item-subtitle">{upcomingCampus.program}</p>
            </div>
            <span className="status-pill reserved">{upcomingCampus.status}</span>
          </div>
          <p className="detail-line">{upcomingCampus.date}</p>
          <p className="muted-text">{upcomingCampus.note}</p>
        </article>
      </section>

      <section className="panel">
        <SectionHeader
          title="最近追加した情報"
          description="更新した内容をまとめて確認"
        />
        <div className="timeline-list">
          {recentItems.map((item) => (
            <article key={item.title} className="timeline-item">
              <p className="timeline-date">{item.date}</p>
              <p className="item-title small">{item.title}</p>
              <p className="muted-text">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
