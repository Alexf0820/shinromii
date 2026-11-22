"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import type { UniversityCandidate } from "@/data/mockData";
import {
  highSchoolMaster, highSchoolDraft, programsForSchool, programLabel, programSources, searchHighSchools,
  type HighSchool, type SchoolProgram,
} from "@/lib/high-school-master";

export function HighSchoolSearchPanel({ onRegister, onCancel }: {
  onRegister: (candidate: UniversityCandidate) => boolean;
  onCancel?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [school, setSchool] = useState<HighSchool | null>(null);
  const [manual, setManual] = useState(false);
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const options = school ? programsForSchool(school.code) : [];
  const hits = searchHighSchools(query);

  function register(program?: SchoolProgram) {
    const name = school?.name ?? query.trim();
    if (!name) return;
    const draft = highSchoolDraft(name, school ?? undefined, program);
    if (manual) {
      draft.faculty = department.trim();
      draft.department = course.trim();
    }
    if (onRegister(draft)) {
      setSchool(null);
      setManual(false);
      setQuery("");
      setDepartment("");
      setCourse("");
    }
  }

  return <section className="panel inline-detail-card inline-editor-card uni-search-panel">
    <SectionHeader title={manual ? "高校を手入力" : school ? school.name : "高校を検索"}
      description={school ? "確認できた募集情報から選べます。学校だけでも登録できます。" : "東京都の国立・公立・私立高校が対象です。地域外の高校も手入力できます。"} />
    {manual ? <div className="form-stack">
      <label className="field-block">高校名<input className="text-input" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label className="field-block">学科（任意）<input className="text-input" value={department} onChange={e => setDepartment(e.target.value)} /></label>
      <label className="field-block">コース（任意）<input className="text-input" value={course} onChange={e => setCourse(e.target.value)} /></label>
      <button className="action-button primary" disabled={!query.trim()} onClick={() => register()}>登録する</button>
    </div> : school ? <>
      {options.length ? <div className="uni-search-list">{options.map(p => <div key={programLabel(p)}>
        <button className="uni-search-item" onClick={() => register(p)}>{programLabel(p)}</button>
        <small>{programSources[p.source].year}年度募集{p.selectionTime && `・${p.selectionTime}に選択`} · <a href={programSources[p.source].url}>募集資料</a></small>
      </div>)}</div> : <p>この高校の学科・コースの募集情報は未確認です。</p>}
      <button className="card-action subtle" onClick={() => register()}>学校だけ登録</button>
    </> : <>
      <label className="field-block">高校名<input type="search" className="text-input" value={query} placeholder="例：三田" onChange={e => setQuery(e.target.value)} /></label>
      <div className="uni-search-list">{hits.map(s => <button className="uni-search-item" key={s.code} onClick={() => setSchool(s)}>
        <span className="uni-search-item-name">{s.name}</span><span className="uni-search-item-meta">東京都｜{s.type}</span>
      </button>)}</div>
      {query.trim() && !hits.length && <p>一致する高校はありません。</p>}
      <p className="uni-search-source"><a href={highSchoolMaster.sourceUrl}>文部科学省 学校コード</a> · {highSchoolMaster.asOf}時点（{highSchoolMaster.edition}） · {highSchoolMaster.schools.length}校
        <span className="uni-search-source-sub">学校の掲載は募集の有無を示しません。学科・コースは確認できたものを掲載しています。</span></p>
      <button className="card-action subtle" onClick={() => setManual(true)}>見つからない場合は手入力</button>
    </>}
    <div className="action-row compact">
      {(manual || school) && <button className="action-button" onClick={() => { setManual(false); setSchool(null); }}>検索に戻る</button>}
      {onCancel && <button className="action-button" onClick={onCancel}>キャンセル</button>}
    </div>
  </section>;
}
