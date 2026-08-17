"use client";

import { useState } from "react";
import {
  ACADEMIC_TRACKS,
  ADMISSION_METHODS,
  INTEREST_FIELDS,
  SCHOOL_YEARS,
  SUBJECT_SUGGESTIONS,
  type UserProfile,
} from "@/lib/user-profile";

type ProfileFieldsProps = {
  value: UserProfile;
  onChange: (next: UserProfile) => void;
  mode: "setup" | "full";
  extraSubjects?: string[];
};

function toggleList<T extends string>(list: T[], item: T) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function SubjectPicker({
  label,
  values,
  suggestions,
  onChange,
}: {
  label: string;
  values: string[];
  suggestions: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addCustom() {
    const next = draft.trim();

    if (!next || values.includes(next)) {
      setDraft("");
      return;
    }

    onChange([...values, next]);
    setDraft("");
  }

  return (
    <div className="field-block">
      <span className="field-label">{label}</span>
      <div className="choice-chips">
        {suggestions.map((subject) => {
          const active = values.includes(subject);

          return (
            <button
              key={subject}
              type="button"
              className={`choice-chip ${active ? "active" : ""}`}
              onClick={() => onChange(toggleList(values, subject))}
            >
              {subject}
            </button>
          );
        })}
        {values
          .filter((subject) => !suggestions.includes(subject))
          .map((subject) => (
            <button
              key={subject}
              type="button"
              className="choice-chip active"
              onClick={() => onChange(values.filter((item) => item !== subject))}
            >
              {subject}
            </button>
          ))}
      </div>
      <div className="profile-add-row">
        <input
          className="text-input"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="候補にない科目を追加"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className="action-button subtle" onClick={addCustom}>
          追加
        </button>
      </div>
    </div>
  );
}

export function ProfileFields({ value, onChange, mode, extraSubjects = [] }: ProfileFieldsProps) {
  const subjectSuggestions = Array.from(new Set([...SUBJECT_SUGGESTIONS, ...extraSubjects]));

  function update<K extends keyof UserProfile>(key: K, next: UserProfile[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="form-stack">
      <label className="field-block">
        <span className="field-label">表示名（任意）</span>
        <input
          className="text-input"
          type="text"
          value={value.displayName}
          onChange={(event) => update("displayName", event.target.value)}
          placeholder="例：えまちん"
          autoComplete="off"
        />
        <span className="field-help">
          家族と共有するときなどに使います。通常の画面には表示されません。
        </span>
      </label>

      <label className="field-block">
        <span className="field-label">現在の学年</span>
        <select
          className="text-input"
          value={value.schoolYear}
          onChange={(event) => update("schoolYear", event.target.value as UserProfile["schoolYear"])}
        >
          <option value="">選択してください</option>
          {SCHOOL_YEARS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      {mode === "full" ? (
        <label className="field-block">
          <span className="field-label">学科 / コース（任意）</span>
          <input
            className="text-input"
            type="text"
            value={value.course}
            onChange={(event) => update("course", event.target.value)}
            placeholder="例：普通科"
            autoComplete="off"
          />
        </label>
      ) : null}

      <div className="field-block">
        <span className="field-label">文系 / 理系 / 未定</span>
        <div className="choice-chips">
          {ACADEMIC_TRACKS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-chip ${value.academicTrack === item.id ? "active" : ""}`}
              onClick={() => update("academicTrack", item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "full" ? (
        <>
          <SubjectPicker
            label="得意科目"
            values={value.strongSubjects}
            suggestions={subjectSuggestions}
            onChange={(next) => update("strongSubjects", next)}
          />
          <SubjectPicker
            label="苦手科目"
            values={value.weakSubjects}
            suggestions={subjectSuggestions}
            onChange={(next) => update("weakSubjects", next)}
          />
        </>
      ) : null}

      <div className="field-block">
        <span className="field-label">興味のある分野 / 学問</span>
        <div className="choice-chips">
          {INTEREST_FIELDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-chip ${value.interestFields.includes(item.id) ? "active" : ""}`}
              onClick={() => update("interestFields", toggleList(value.interestFields, item.id))}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className="text-input"
          type="text"
          value={value.interestNote}
          onChange={(event) => update("interestNote", event.target.value)}
          placeholder="例：英語、情報、ビジネス"
          autoComplete="off"
        />
        <span className="field-help">候補を選ばなくても、自由に書けます。</span>
      </div>

      {mode === "full" ? (
        <label className="field-block">
          <span className="field-label">将来やってみたいこと</span>
          <textarea
            className="text-area"
            rows={3}
            value={value.futureAspiration}
            onChange={(event) => update("futureAspiration", event.target.value)}
            placeholder="例：英語を使う仕事に少し興味がある"
          />
          <span className="field-help">未定でも大丈夫です。</span>
        </label>
      ) : null}

      <div className="field-block">
        <span className="field-label">希望する入試方式</span>
        <div className="choice-chips">
          {ADMISSION_METHODS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-chip ${value.admissionMethods.includes(item.id) ? "active" : ""}`}
              onClick={() =>
                update("admissionMethods", toggleList(value.admissionMethods, item.id))
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="field-help">複数選べます。</span>
      </div>

      {mode === "full" ? (
        <label className="field-block">
          <span className="field-label">進路についての自由メモ</span>
          <textarea
            className="text-area"
            rows={4}
            value={value.careerMemo}
            onChange={(event) => update("careerMemo", event.target.value)}
            placeholder="今の気持ちや、家族と話したことを残せます"
          />
        </label>
      ) : null}
    </div>
  );
}
