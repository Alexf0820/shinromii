"use client";

type ScoreSelectorProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
};

export function ScoreSelector({ label, value, onChange }: ScoreSelectorProps) {
  return (
    <div className="score-selector">
      <div className="row-between gap-sm">
        <p className="feedback-label">{label}</p>
        <span className="muted-text">{value ? `${value} / 5` : "未設定"}</span>
      </div>
      <div className="score-button-row">
        {[1, 2, 3, 4, 5].map((score) => {
          const isActive = value === score;

          return (
            <button
              key={score}
              type="button"
              className={`score-button ${isActive ? "active" : ""}`}
              aria-pressed={isActive}
              onClick={() => onChange(isActive ? null : score)}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
