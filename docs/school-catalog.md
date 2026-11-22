# 学校カタログの更新

学校名簿と入学者募集資料は年度を分けて扱う。公開資料で確かめた名称だけを収録し、端末の保存済み候補は登録時の名称・年度とともに保持する。

| カタログ | 2026-11-22 に照合した基準 | 更新箇所 |
| --- | --- | --- |
| 大学 | 文科省「全国大学一覧」の最新掲載は令和7年度。基準は819校・学部等2,747件。昭和女子大学について公式の組織表で2026年度7学部を確認。2025年度の6学部に総合情報学部が加わった。 | 全国版は年度別JSON。大学個別の確認結果は `data/university-master/reviewed.json`。個別版は全国版より新しい年度の場合に適用する。 |
| 高校名 | 文科省学校コードの2026-05-01暫定版、東京都の学校種D1、廃止済みを除く434件。国立6、公立187、私立241。中等教育学校の後期課程は対象外。 | `data/high-school-master/tokyo.json` |
| 高校の募集 | 都教委の2027年度募集資料から全日制の増減表17校と通信制3校。錦城高校の同年度募集要項から出願時の2コース。1校に複数の課程・学科があっても確認した行だけを掲載する。 | `data/high-school-master/programs.json` |

大学の出典は文部科学省の[全国大学一覧の年度索引](https://www.mext.go.jp/a_menu/koutou/ichiran/mext_01853.html)と、昭和女子大学の「設置学部・学科・大学院研究科等」。高校は[学校コード](https://www.mext.go.jp/b_menu/toukei/mext_01087.html)、[都立高校募集人員](https://www.kyoiku.metro.tokyo.lg.jp/admission/high_school/application/enroll/release2026100801)、[都内私立高校選抜実施要項](https://www.my.metro.tokyo.lg.jp/w/116-20261007-270259347)、[錦城高校募集要項](https://www.kinjo-highschool.ed.jp/admission/requirements.php)を確認した。学校コードの収録だけで翌年度募集の有無を判定しない。

## 再生成

公式ファイルはローカルに保存する。大学は対象年度、出典、入力ファイル名と設置区分を指定したJSONを用意する。既存の令和7年度用設定は `data/university-master/r7-inputs.json`。次のコマンドで候補JSONと、学校IDごとの追加・変更・削除の一覧を生成できる。

```sh
python scripts/build-university-master.py --source-dir "$source_dir" --manifest "$manifest" \
  --previous data/university-master/r7-2025.json --out "$candidate" --checked-at "$checked_at"
```

東京都の学校名簿は学校コードの東日本Excelを入力する。

```sh
python scripts/build-tokyo-high-schools.py "$workbook" --as-of "$as_of" --checked-at "$checked_at" \
  --edition "$edition" --source-file-url "$source_file_url" --out "$candidate"
```

11月22日取得分のSHA-256は、文科省東日本Excelが `3b050afef9c8052fb6a60b1e44c584c9ac73dcb23c6be3a6bfa90e8649a5cd5d`、錦城高校「募集要項2027-1.pdf」が `aee41a0b131524a2ed40866e0b46f512b62d428204c73f019823c0975e2ebf8a`。同じURLで資料が差し替わった場合はファイル本体の変更も確認する。

変更を見つけたら対象年度・旧名称・新名称・根拠資料を確認し、作業ブランチで反映する。全国版を切り替える際は旧年度のJSONを残し、読み込み先と個別更新の要否を確認する。年度表の行の消失だけで募集停止や学部の改称を決めない。資料が取得できなければ既存データを保つ。テスト・ビルド・Previewで検索、登録、復元を確認してから公開判断へ進める。
