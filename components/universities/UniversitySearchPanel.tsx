"use client";

import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import type { UniversityCandidate } from "@/data/mockData";
import { createUniversityCandidateDraft } from "@/lib/university-draft";
import {
  formatUniversityMasterCheckedAt,
  searchUniversityMaster,
  type UniversityMaster,
} from "@/lib/university-master";

type SearchStep = "search" | "faculties" | "manual";

type UniversitySearchPanelProps = {
  onRegister: (candidate: UniversityCandidate) => boolean;
  onCancel?: () => void;
  showCancel?: boolean;
  /** 指定すると、手入力は呼び出し側の既存フォームを開く */
  onManual?: (universityName: string, master?: UniversityMaster | null) => void;
};

export function UniversitySearchPanel({
  onRegister,
  onCancel,
  showCancel = true,
  onManual,
}: UniversitySearchPanelProps) {
  const [step, setStep] = useState<SearchStep>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMaster, setSelectedMaster] = useState<UniversityMaster | null>(null);
  const [manualUniversity, setManualUniversity] = useState("");
  const [manualFaculty, setManualFaculty] = useState("");

  const searchResults = useMemo(() => searchUniversityMaster(searchQuery), [searchQuery]);

  function resetSearch() {
    setStep("search");
    setSearchQuery("");
    setSelectedMaster(null);
    setManualUniversity("");
    setManualFaculty("");
  }

  function register(candidate: UniversityCandidate) {
    if (!onRegister(candidate)) {
      return;
    }

    resetSearch();
  }

  function openManual(universityName = "", master: UniversityMaster | null = null) {
    if (onManual) {
      onManual(universityName, master);
      return;
    }

    setSelectedMaster(master);
    setManualUniversity(universityName);
    setManualFaculty("");
    setStep("manual");
  }

  function handleManualSave() {
    if (!manualUniversity.trim()) {
      window.alert("大学名を入力してください。");
      return;
    }

    register(
      createUniversityCandidateDraft({
        university: manualUniversity,
        faculty: manualFaculty,
        master: selectedMaster && selectedMaster.name === manualUniversity.trim() ? selectedMaster : null,
      }),
    );
  }

  if (step === "manual") {
    return (
      <section className="panel inline-detail-card inline-editor-card uni-search-panel">
        <SectionHeader title="手入力で登録" description="学部が決まっていなければ空欄のままで大丈夫です" />
        <div className="form-stack">
          <label className="field-block">
            <span className="field-label">大学名</span>
            <input
              className="text-input"
              type="text"
              value={manualUniversity}
              onChange={(event) => setManualUniversity(event.target.value)}
            />
          </label>
          <label className="field-block">
            <span className="field-label">学部名（任意）</span>
            <input
              className="text-input"
              type="text"
              value={manualFaculty}
              placeholder="まだ決めていない"
              onChange={(event) => setManualFaculty(event.target.value)}
            />
          </label>
          <div className="action-row">
            <button type="button" className="action-button primary" onClick={handleManualSave}>
              登録
            </button>
            <button type="button" className="action-button" onClick={() => setStep(selectedMaster ? "faculties" : "search")}>
              戻る
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "faculties" && selectedMaster) {
    return (
      <section className="panel inline-detail-card inline-editor-card uni-search-panel">
        <SectionHeader title="学部を選択" description={selectedMaster.name} />
        {selectedMaster.faculties.length > 0 ? (
          <div className="uni-search-list">
            {selectedMaster.faculties.map((faculty) => (
              <button
                key={faculty.id}
                type="button"
                className="uni-search-item"
                onClick={() =>
                  register(
                    createUniversityCandidateDraft({
                      university: selectedMaster.name,
                      faculty: faculty.name,
                      master: selectedMaster,
                      facultyMasterId: faculty.id,
                    }),
                  )
                }
              >
                <span className="uni-search-item-name">{faculty.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted-text">この大学の学部データが一覧にないため、手入力で追加してください。</p>
        )}
        <button
          type="button"
          className="card-action subtle"
          onClick={() =>
            register(
              createUniversityCandidateDraft({
                university: selectedMaster.name,
                faculty: "",
                master: selectedMaster,
              }),
            )
          }
        >
          まだ決めていない
        </button>
        <button
          type="button"
          className="card-action subtle"
          onClick={() => openManual(selectedMaster.name, selectedMaster)}
        >
          見つからない場合は手入力
        </button>
        <div className="action-row compact">
          <button type="button" className="action-button" onClick={() => setStep("search")}>
            大学検索に戻る
          </button>
          {showCancel && onCancel ? (
            <button type="button" className="action-button" onClick={onCancel}>
              キャンセル
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="panel inline-detail-card inline-editor-card uni-search-panel">
      <SectionHeader title="大学を検索" description="大学名の一部を入力すると候補が出ます" />
      <label className="field-block">
        <span className="field-label">大学名</span>
        <input
          className="text-input"
          type="search"
          value={searchQuery}
          placeholder="例: 明治"
          autoComplete="off"
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>
      <div className="uni-search-list">
        {searchQuery.trim() ? (
          searchResults.length > 0 ? (
            searchResults.map((university) => (
              <button
                key={university.id}
                type="button"
                className="uni-search-item"
                onClick={() => {
                  setSelectedMaster(university);
                  setStep("faculties");
                }}
              >
                <span className="uni-search-item-name">{university.name}</span>
                <span className="uni-search-item-meta">
                  {university.prefecture}｜{university.type}
                </span>
              </button>
            ))
          ) : (
            <p className="muted-text">一致する大学はありません。</p>
          )
        ) : (
          <p className="muted-text">2文字以上だと絞り込みやすいです。</p>
        )}
      </div>
      <p className="uni-search-source">
        大学・学部データ {formatUniversityMasterCheckedAt()}
        <span className="uni-search-source-sub">文部科学省の公開情報をもとに作成</span>
      </p>
      <button type="button" className="card-action subtle" onClick={() => openManual()}>
        見つからない場合は手入力
      </button>
      {showCancel && onCancel ? (
        <div className="action-row compact">
          <button type="button" className="action-button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      ) : null}
    </section>
  );
}
