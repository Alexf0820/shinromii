export function PlanComparisonTable() {
  const rows = [
    ["登録", "不要", "必要"],
    ["基本機能", "使える", "使える"],
    ["件数制限", "なし", "なし"],
    ["保存", "この端末", "Cloud"],
    ["家族共有", "手動でバックアップを渡せる", "自動で共有できる予定"],
    ["複数端末", "手動で移せる", "手間なく同じ内容を使える予定"],
    ["バックアップ", "手動", "自動バックアップ（予定）"],
    ["画像から入力", "なし", "対応予定"],
    ["広告", "少量あり予定", "なし"],
  ] as const;

  return (
    <section className="plan-table-section">
      <div className="plan-table-wrap">
        <table className="plan-table">
          <thead>
            <tr>
              <th scope="col">機能</th>
              <th scope="col">この端末だけ・無料</th>
              <th scope="col">Cloud版</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, localValue, cloudValue]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{localValue}</td>
                <td>{cloudValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="plan-table-note">
        無料版でも、十分にお使いいただけます。必要に応じて、あとからCloud版へ変更できる形を予定しています。
      </p>
    </section>
  );
}
