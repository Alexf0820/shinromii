"""Build the Tokyo high-school name index from MEXT's eastern Japan school-code workbook."""
import argparse
import json
import re
from datetime import date
from pathlib import Path

import openpyxl


def read_schools(path):
    owners = {"1(国)": "国立", "2(公)": "公立", "3(私)": "私立"}
    schools = {}
    book = openpyxl.load_workbook(path, data_only=True, read_only=True)
    try:
        rows = iter(book.active.values)
        next(rows)
        columns = [str(value).replace("\n", "") for value in next(rows)]
        for cells in rows:
            row = dict(zip(columns, cells))
            if row["学校種"] != "D1(高校)" or row["都道府県番号"] != "13(東京)":
                continue
            if row["属性情報廃止年月日"] or row["本分校"] == "9(廃)":
                continue
            code, name = row["学校コード"], row["学校名"]
            if not re.fullmatch(r"D113\d{9}", code) or not name or code in schools:
                raise ValueError(f"Invalid or duplicate school: {code} {name}")
            schools[code] = {"code": code, "name": name, "type": owners[row["設置区分"]]}
    finally:
        book.close()
    if {s["type"] for s in schools.values()} != set(owners.values()):
        raise ValueError("Incomplete Tokyo school index")
    return sorted(schools.values(), key=lambda s: s["code"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    parser.add_argument("--checked-at", type=date.fromisoformat, required=True)
    parser.add_argument("--edition", required=True)
    parser.add_argument("--source-file-url", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    payload = {"asOf": str(args.as_of), "edition": args.edition, "checkedAt": str(args.checked_at),
               "sourceUrl": "https://www.mext.go.jp/b_menu/toukei/mext_01087.html",
               "sourceFileUrl": args.source_file_url, "schools": read_schools(args.workbook)}
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
