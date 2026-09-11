"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSchoolSubjectsTemplate, type SchoolSubjectsTemplate } from "@/lib/school-subject-templates";
import { applySchoolSubjectsTemplate, inspectSchoolTemplateTarget } from "@/lib/shinromii-storage";

export default function SchoolTemplatePage() {
  const [template, setTemplate] = useState<SchoolSubjectsTemplate>();
  const [target, setTarget] = useState<{ hasGrades: boolean; replacing: boolean }>();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const selected = getSchoolSubjectsTemplate(new URLSearchParams(window.location.search).get("key") ?? "");
    setTemplate(selected);
    if (!selected) { setError("科目テンプレートが見つかりません。"); return; }
    try { setTarget(inspectSchoolTemplateTarget()); }
    catch (e) { setError(e instanceof Error ? e.message : "保存状態を確認できません。"); }
  }, []);

  function apply() {
    if (!template) return;
    try { applySchoolSubjectsTemplate(template.key); setSaved(true); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
  }

  return <section className="panel" style={{ padding: "24px" }}>
    <h1>学校の科目テンプレートがあります</h1>
    {template && <>
      <h2>{template.school.displayName}</h2>
      <p>高校{template.grade}年 ／ コース：{template.course}</p>
      <p>登録される科目（{template.subjects.length}科目）</p>
      <ul>{template.subjects.map((subject) => <li key={subject}>{subject}</li>)}</ul>
      <p>共有するのは科目設定だけです。氏名・成績などの個人データは含まれません。</p>
    </>}
    {error && <p role="alert">{error}</p>}
    {saved ? <>
      <p role="status">科目設定を保存しました。成績入力で科目を選択できます。</p>
      <Link className="primary-button" href="/">SHINROMiiへ進む</Link>
    </> : <>
      {target?.hasGrades ? <p role="alert">成績が登録されています。現在の科目設定の置き換えは成績データに影響する可能性があるため、Ver.0.1では適用できません。</p>
        : target && <p>{target.replacing ? "現在の科目設定を置き換えます。" : "新しく科目設定を登録します。既存の科目設定の置き換えはありません。"} 成績・プロフィールは変更しません。</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <button className="primary-button" disabled={!target || target.hasGrades || !!error} onClick={apply}>この科目設定を使う</button>
        <Link className="secondary-button" href="/">キャンセル</Link>
      </div>
    </>}
  </section>;
}
